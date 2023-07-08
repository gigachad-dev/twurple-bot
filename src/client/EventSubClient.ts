import { ApiClient } from '@twurple/api'
import { EventSubWsListener } from '@twurple/eventsub-ws'
import path from 'path'
import { getUsersData } from '../utils/getUserId'
import migration from '../migrations/eventsub.json'
import type { TwurpleClient } from './TwurpleClient'
import type { HelixUpdateCustomRewardData } from '@twurple/api'
import type { LowSync } from 'lowdb-hybrid'

// TODO: иногда не апдейтятся реварды, особенно когда это происходит несколько раз за короткий промежуток времени.
// сделать отлов неудачных попыток и запускать ещё раз обновление через какое-то время

interface Variable {
  name: string
  baseText: string
  0: string
  1: string
  '2-4': string
  other: string
}

interface User {
  id: string
  name: string
}

interface Description {
  text: string
  variables: Variable[]
}

interface Reward {
  id?: string
  title: string
  count: number
  baseCost: number
  currentCost: number
  isEnabled: boolean
  increment: number
  queueLength?: number
  prompt: string
  description?: Description
}

interface EventSubs {
  rewards: Reward[]
}

export class EventSubClient {
  private client: TwurpleClient
  private users: User[]

  private db: LowSync<EventSubs>
  private rewards: Reward[]

  constructor(client: TwurpleClient) {
    this.client = client

    this.db = this.client.lowdbAdapter<EventSubs>({
      path: path.join(__dirname, '../../config/eventsub.json'),
      initialData: migration as EventSubs
    })

    this.rewards = this.db.data.rewards
  }

  async connect() {
    this.users = await getUsersData(
      this.client.api.users,
      this.client.db.data.channels
    )

    for (const user of this.users) {
      this.updateLocalInfo(user.id)

      //Создаём реварды
      await this.createRewards(user.id)
    }

    //Event Sub
    const esClient = new ApiClient({
      authProvider: this.client.auth,
      logger: {
        timestamps: true,
        colors: true,
        emoji: true,
        minLevel: 3
      }
    })

    await esClient.eventSub.deleteAllSubscriptions()

    const listener = new EventSubWsListener({ apiClient: this.client.api })

    for (const user of this.users) {
      await this.registerOnRedemption(listener, user.id)
    }

    listener.start()
  }

  private async registerOnRedemption(
    listener: EventSubWsListener,
    userId: string
  ) {
    this.rewards.forEach((reward) => {
      this.client.logger.info(`Bind events for ${reward.title}`, 'EventSub')
      // Юзер купил награду
      listener.onChannelRedemptionAddForReward(userId, reward.id, (data) => {
        const rewardToUpdate = this.rewards.find(
          (redemption) => data.rewardId === redemption.id
        )
        this.client.logger.info(
          `Reward redeemed: ${rewardToUpdate.title}`,
          'EventSub'
        )
        if (rewardToUpdate.increment) {
          rewardToUpdate.queueLength++
          rewardToUpdate.currentCost += rewardToUpdate.increment

          const newData = this.getDescription(rewardToUpdate)

          this.client.logger.info(
            `Updating cost: ${
              rewardToUpdate.currentCost - rewardToUpdate.increment
            } -> ${rewardToUpdate.currentCost}`,
            'EventSub'
          )
          this.client.api.channelPoints
            .updateCustomReward(userId, rewardToUpdate.id, {
              cost: rewardToUpdate.currentCost,
              ...newData
            })
            .then(
              (v) => this.client.logger.info('OK', 'EventSub'),
              (r) => this.client.logger.info(r, 'EventSub')
            )
          Object.assign(rewardToUpdate, {
            currentCost: rewardToUpdate.currentCost,
            queueLength: rewardToUpdate.queueLength
          })
          this.db.write()
        }
      })

      // Стример нажал вернуть поинты или забрал себе
      listener.onChannelRedemptionUpdateForReward(userId, reward.id, (data) => {
        const rewardToUpdate = this.rewards.find(
          (redemption) => data.rewardId === redemption.id
        )
        this.client.logger.info(`Reward changed: ${data.status}`, 'EventSub')
        if (data.status !== 'UNFULFILLED') {
          rewardToUpdate.queueLength--
          rewardToUpdate.currentCost -= rewardToUpdate.increment

          const newData = this.getDescription(rewardToUpdate)

          this.client.api.channelPoints
            .updateCustomReward(userId, rewardToUpdate.id, {
              cost: rewardToUpdate.currentCost,
              ...newData
            })
            .then(
              (rew) => {
                this.client.logger.info('Reward updated', 'EventSub')
              },
              (reason) => {
                this.client.logger.info(reason, 'EventSub')
              }
            )
            .catch((reason) => {
              this.client.logger.info(reason, 'EventSub')
            })
          Object.assign(rewardToUpdate, {
            currentCost: rewardToUpdate.currentCost,
            queueLength: rewardToUpdate.queueLength
          })
          this.db.write()
        }
      })
    })
  }

  private getDescription(rew: Reward): HelixUpdateCustomRewardData {
    if (!rew.description) return {}
    let newText = rew.description.text
    for (const k of rew.description.variables) {
      const v = rew[k.name]
      let tempText = this.parsePlural(k, v).replace('%v', v)
      tempText = k.baseText.replace('%v', tempText)
      newText = newText.replace('%v', tempText)
    }
    return { prompt: newText }
  }

  private parsePlural(v: Variable, num: number): string {
    const div10 = num % 10
    const div100 = num % 100
    if (num === 0) {
      return v[0]
    }
    if (div10 === 1) {
      return v[1]
    }
    if (div10 >= 1 && div10 <= 4 && !(div100 >= 11 && div100 <= 14)) {
      return v['2-4']
    }
    return v['other']
  }

  private updateLocalInfo(userId: string) {
    const checkRewards = this.rewards.filter((val) => val.id)
    for (const reward of checkRewards) {
      this.client.api.channelPoints
        .getRedemptionsForBroadcaster(userId, reward.id, 'UNFULFILLED', {})
        .then((val) => {
          Object.assign(reward, {
            queueLength: val.data.length,
            currentCost: reward.baseCost + reward.increment * val.data.length
          })
          this.db.write()
        })
    }
  }

  private async createRewards(userId: string) {
    if (!this.rewards.some((reward) => !reward.id)) return

    //Создаём доступный боту ревард на основе существующего, если уже не создан
    const existingRewards =
      await this.client.api.channelPoints.getCustomRewards(userId, false)
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
        userId,
        {
          cost:
            reward.cost +
            thisReward.increment *
              (thisReward.queueLength ? thisReward.queueLength : 0),
          title: reward.title + ' (BOT)',
          autoFulfill: reward.autoFulfill,
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
}
