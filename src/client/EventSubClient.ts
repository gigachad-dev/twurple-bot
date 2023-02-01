import ms from 'ms'
import path from 'path'
import { VM } from 'vm2'
import { PubSubClient as PubSub } from '@twurple/pubsub'
import type { StringValue } from 'ms'
import type { LowSync } from 'lowdb-hybrid'
import type { TokenInfo } from '@twurple/auth'
import { ClientCredentialsAuthProvider } from '@twurple/auth'
import type { TwurpleClient } from './TwurpleClient'
import type { PubSubRedemptionMessage } from '@twurple/pubsub'
import migration from '../migrations/eventsub.json'
import type { HelixUpdateCustomRewardData } from '@twurple/api'
import { ApiClient, HelixCustomRewardRedemption } from '@twurple/api'
import { forEach, iteratee, values } from 'lodash'
import type { EventSubListener } from '@twurple/eventsub'
import { NgrokAdapter } from '@twurple/eventsub-ngrok'
import { EventSubWsListener } from '@twurple/eventsub-ws'

// TODO: иногда не апдейтятся реварды, особенно когда это происходит несколько раз за короткий промежуток времени.
// сделать отлов неудачных попыток и запускать ещё раз обновление через какое-то время

interface Variable{
  name: string;
  baseText: string;
  0: string;
  1: string;
  '2-4': string;
  other: string;
}

interface Description{
  text: string;
  variables: Variable[];
}

interface Reward {
  id?: string;
  title: string;
  count: number;
  baseCost: number;
  currentCost: number;
  isEnabled: boolean;
  increment: number;
  queueLength?: number;
  prompt: string;
  description?: Description;
}

interface EventSubs {
  blackhole: Reward;
  rewards: Reward[];
}

export class EventSubClient {
  private client: TwurpleClient
  private tokenInfo: TokenInfo

  private db: LowSync<EventSubs>
  private blackhole: Reward
  private rewards: Reward[]

  constructor(client: TwurpleClient) {
    this.client = client

    this.db = this.client.lowdbAdapter<EventSubs>({
      path: path.join(__dirname, '../../config/eventsub.json'),
      initialData: migration as EventSubs
    })

    this.blackhole = this.db.data.blackhole
    this.rewards = this.db.data.rewards
  }

  async connect() {
    this.tokenInfo = await this.client.api.getTokenInfo()

    this.updateLocalInfo()

    //Создаём реварды
    await this.createRewards()


    //Создаём блекхол
    await this.createBlackhole()


    //Event Sub
    const esClient = new ApiClient({
      authProvider: new ClientCredentialsAuthProvider(
        this.tokenInfo.clientId,
        this.client.config.clientSecret
      ),
      logger: {
        timestamps: true,
        colors: true,
        emoji: true,
        minLevel: 3
      }
    })

    const adapter = new NgrokAdapter()
    
    await esClient.eventSub.deleteAllSubscriptions()

    const listener = new EventSubWsListener({ apiClient: this.client.api })

    await this.registerOnRedemption(listener)

    await listener.start()
    
  }

  private async registerOnRedemption(listener: EventSubWsListener) {

    listener.subscribeToChannelRedemptionAddEventsForReward(this.tokenInfo.userId,
      this.blackhole.id,
      (data) => {
        this.blackhole.currentCost +=
            Math.floor(this.blackhole.currentCost * 0.1) < 1
              ? Math.ceil(this.blackhole.currentCost * 0.1)
              : Math.floor(this.blackhole.currentCost * 0.1)
        this.blackhole.count++
        this.client.api.channelPoints.updateCustomReward(
          this.tokenInfo.userId,
          this.blackhole.id,
          {
            cost: this.blackhole.currentCost,
            title: this.blackhole.title + ` lvl.${this.blackhole.count}`
          }
        ).then((reason)=>{
          this.client.logger.info('Blackhole increased', 'EventSub')
        },(reason)=>{
          this.client.logger.info(reason, 'EventSub')
        })
        Object.assign(this.blackhole, {
          currentCost: this.blackhole.currentCost,
          count: this.blackhole.count
        })
        this.db.write()
      })

    this.rewards.forEach((reward) => {
      this.client.logger.info(`Bind events for ${reward.title}`, 'EventSub')
      // Юзер купил награду
      listener.subscribeToChannelRedemptionAddEventsForReward(this.tokenInfo.userId,
        reward.id,
        (data) =>{
          const rewardToUpdate = this.rewards.find(
            (redemption) => data.rewardId === redemption.id
          )
          this.client.logger.info(`Reward redeemed: ${rewardToUpdate.title}`,'EventSub')
          if (rewardToUpdate.increment) {
            rewardToUpdate.queueLength++
            rewardToUpdate.currentCost += rewardToUpdate.increment
            
            const newData = this.getDescription(rewardToUpdate)

            this.client.api.channelPoints.updateCustomReward(
              this.tokenInfo.userId,
              rewardToUpdate.id,
              { cost: rewardToUpdate.currentCost,
                ...newData }
            )
            Object.assign(rewardToUpdate, { currentCost: rewardToUpdate.currentCost,
              queueLength: rewardToUpdate.queueLength })
            this.db.write()
          }
        })

      // Стример нажал вернуть поинты или забрал себе
      listener.subscribeToChannelRedemptionUpdateEventsForReward(
        this.tokenInfo.userId,
        reward.id,
        (data) => {
          const rewardToUpdate = this.rewards.find(
            (redemption) => data.rewardId === redemption.id
          )
          this.client.logger.info(`Reward changed: ${data.status}`, 'EventSub')
          if (data.status !== 'UNFULFILLED') {
            rewardToUpdate.queueLength--
            rewardToUpdate.currentCost -= rewardToUpdate.increment

            const newData = this.getDescription(rewardToUpdate)

            this.client.api.channelPoints.updateCustomReward(
              this.tokenInfo.userId,
              rewardToUpdate.id,
              { cost: rewardToUpdate.currentCost, ...newData }
            ).then((rew) => { this.client.logger.info('Reward updated', 'EventSub') },
              (reason)=>{
                this.client.logger.info(reason, 'EventSub')
              })
              .catch((reason) => {
                this.client.logger.info(reason, 'EventSub')
              })
            Object.assign(rewardToUpdate, { currentCost: rewardToUpdate.currentCost,
              queueLength: rewardToUpdate.queueLength })
            this.db.write()
          }
        }
      )
    })
  }

  private getDescription(rew: Reward): HelixUpdateCustomRewardData{
    if(!rew.description)
      return {}
    let newText = rew.description.text
    for (const k of rew.description.variables){
      const v = rew[k.name]
      let tempText = this.parsePlural(k,v).replace('%v', v)
      tempText = k.baseText.replace('%v', tempText)
      newText = newText.replace('%v', tempText)
    }
    return { prompt: newText }
  }

  private parsePlural(v : Variable, num:number): string{
    const div10 = num % 10
    const div100 = num % 100
    if (num === 0){
      return v[0]
    }
    if (div10 === 1){
      return v[1]
    }
    if ((div10 >= 1 && div10 <= 4) && !(div100 >= 11 && div100 <= 14))
    {
      return v['2-4']
    }
    return v['other']
  }

  private updateLocalInfo(){
    const checkRewards = this.rewards.filter((val)=> val.id)
    for (const reward of checkRewards)
    {
      this.client.api.channelPoints.getRedemptionsForBroadcaster(this.tokenInfo.userId,
        reward.id,
        'UNFULFILLED', {})
        .then((val) => {
          Object.assign(reward, { queueLength: val.data.length,
            currentCost: reward.baseCost + reward.increment * val.data.length })
          this.db.write()
        })
    }
  }

  private async createRewards(){
    if (!this.rewards.some((reward) => !reward.id))
      return
    
    //Создаём доступный боту ревард на основе существующего, если уже не создан
    const existingRewards =
      await this.client.api.channelPoints.getCustomRewards(
        this.tokenInfo.userId,
        false
      )
    //Берём реварды, которых нет и которые нужно создать
    const rewardsToCreate = existingRewards.filter((existingReward) =>
      this.rewards.find(
        (thisReward) =>
          thisReward.title === existingReward.title && !thisReward.id
      )
    )

    //Создаём ивенты
    for (const reward of rewardsToCreate) {
      const thisReward = this.rewards.find(
        (value) => value.title === reward.title
      )
      const newReward = await this.client.api.channelPoints.createCustomReward(
        this.tokenInfo.userId,
        {
          cost:
            reward.cost +
            thisReward.increment *
              (thisReward.queueLength ? thisReward.queueLength : 0),
          title: reward.title + ' (BOT)',
          autoFulfill: reward.autoApproved,
          backgroundColor: reward.backgroundColor,
          globalCooldown: reward.globalCooldown,
          isEnabled: reward.isEnabled,
          maxRedemptionsPerStream: reward.maxRedemptionsPerStream,
          maxRedemptionsPerUserPerStream: reward.maxRedemptionsPerUserPerStream,
          prompt: reward.prompt,
          userInputRequired: reward.userInputRequired
        }
      )

      thisReward.id = newReward.id

      Object.assign(thisReward, { id: newReward.id })
      this.db.write()
    }
  }

  private async createBlackhole(){
    if (this.blackhole.id)
      return
    const newReward = await this.client.api.channelPoints.createCustomReward(
      this.tokenInfo.userId,
      {
        cost: this.blackhole.currentCost,
        title: this.blackhole.title,
        autoFulfill: true,
        isEnabled: this.blackhole.isEnabled,
        prompt: this.blackhole.prompt,
        backgroundColor: '#000000'
      }
    )

    this.blackhole.id = newReward.id

    Object.assign(this.blackhole, { id: this.blackhole.id, count: 0 })
    this.db.write()
  }
}
