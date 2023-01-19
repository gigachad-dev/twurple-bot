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
import { ApiClient, HelixCustomRewardRedemption } from '@twurple/api'
import { forEach, values } from 'lodash'
import type { EventSubListener } from '@twurple/eventsub'
import { NgrokAdapter } from '@twurple/eventsub-ngrok'
import { EventSubWsListener } from '@twurple/eventsub-ws'

// TODO: иногда не апдейтятся реварды, особенно когда это происходит несколько раз за короткий промежуток времени.
// сделать отлов неудачных попыток и запускать ещё раз обновление через какое-то время

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
}

interface EventSubs {
  blackhole: Reward;
  rewards: Reward[];
}

export class EventSubClient {
  private client: TwurpleClient
  private eventsubClient: ApiClient
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

    // const listener = new EventSubListener({
    //   apiClient: esClient,
    //   adapter: new NgrokAdapter(),
    //   secret: this.tokenInfo.userId,
    //   strictHostCheck: true
    // })
    const listener = new EventSubWsListener({ apiClient: this.client.api })

    await this.registerOnRedemption(listener)

    await listener.start()
    
  }

  private async registerOnRedemption(listener: EventSubWsListener) {
    // await this.client.pubsub.pubsub.onRedemption(
    //   this.tokenInfo.userId,
    //   (event) => {
    //     const reward = this.rewards.find(
    //       (redemption) => redemption.id === event.rewardId
    //     )
    //     if (reward) {
    //       if (reward.increment) {
    //         reward.queueLength++
    //         reward.currentCost += reward.increment
    //         this.client.api.channelPoints.updateCustomReward(
    //           this.tokenInfo.userId,
    //           reward.id,
    //           { cost: reward.currentCost }
    //         )
    //         Object.assign(reward, { currentCost: reward.currentCost, queueLength: reward.queueLength })
    //         this.db.write()
    //       }
    //     }
    //     //Увеличиваем черную дыру
    //     if (event.rewardId === this.blackhole.id) {
    //       this.blackhole.currentCost +=
    //         Math.floor(this.blackhole.currentCost * 0.1) < 1
    //           ? Math.ceil(this.blackhole.currentCost * 0.1)
    //           : Math.floor(this.blackhole.currentCost * 0.1)
    //       this.blackhole.count++
    //       this.client.api.channelPoints.updateCustomReward(
    //         this.tokenInfo.userId,
    //         this.blackhole.id,
    //         {
    //           cost: this.blackhole.currentCost,
    //           title: this.blackhole.title + ` lvl.${this.blackhole.count}`
    //         }
    //       ).then((reason)=>{
    //         this.client.logger.info('Reward updated')
    //       },(reason)=>{
    //         this.client.logger.info(reason)
    //       })
    //       Object.assign(this.blackhole, {
    //         currentCost: this.blackhole.currentCost,
    //         count: this.blackhole.count
    //       })
    //       this.db.write()
    //     }
    //   }
    // )

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
            this.client.api.channelPoints.updateCustomReward(
              this.tokenInfo.userId,
              rewardToUpdate.id,
              { cost: rewardToUpdate.currentCost }
            )
            Object.assign(rewardToUpdate, { currentCost: rewardToUpdate.currentCost,
              queueLength: rewardToUpdate.queueLength })
            this.db.write()
          }
        })

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
            this.client.api.channelPoints.updateCustomReward(
              this.tokenInfo.userId,
              rewardToUpdate.id,
              { cost: rewardToUpdate.currentCost }
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
