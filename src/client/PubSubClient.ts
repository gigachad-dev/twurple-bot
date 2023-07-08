import { PubSubClient as PubSub } from '@twurple/pubsub'
import ms from 'ms'
import path from 'path'
import { getUsersData } from '../utils/getUserId'
import { VM } from 'vm2'
import migration from '../migrations/pubsub.json'
import type { TwurpleClient } from './TwurpleClient'
import type { TokenInfo } from '@twurple/auth'
import type { PubSubRedemptionMessage } from '@twurple/pubsub'
import type { LowSync } from 'lowdb-hybrid'
import type { StringValue } from 'ms'

interface Redemption {
  title: string
  action: string
  timeout?: {
    time: StringValue
    action: string
  }
}

interface PubSubs {
  redemptions: Redemption[]
}

export class PubSubClient {
  private client: TwurpleClient
  public pubsub: PubSub
  private tokenInfo: TokenInfo

  private db: LowSync<PubSubs>
  private redemptions: Redemption[]

  constructor(client: TwurpleClient) {
    this.client = client

    this.db = this.client.lowdbAdapter<PubSubs>({
      path: path.join(__dirname, '../../config/pubsub.json'),
      initialData: migration as PubSubs
    })

    this.redemptions = this.db.data.redemptions
  }

  async connect() {
    this.pubsub = new PubSub({ authProvider: this.client.auth })

    const users = await getUsersData(
      this.client.api.users,
      this.client.db.data.channels
    )

    this.tokenInfo = await this.client.api.getTokenInfo()

    this.pubsub.onRedemption(users[0].id, (event) => {
      const redemption = this.redemptions.find(
        (redemption) => redemption.title === event.rewardTitle
      )
      if (redemption) {
        if (redemption.action) {
          this.say(redemption, event)
        }
      }
    })
  }

  private async say(redemption: Redemption, event: PubSubRedemptionMessage) {
    this.client.say(
      this.tokenInfo.userName,
      await this.vm(redemption.action, event)
    )

    if (redemption.timeout) {
      setTimeout(async () => {
        this.client.say(
          this.tokenInfo.userName,
          await this.vm(redemption.timeout.action, event)
        )
      }, ms(redemption.timeout.time))
    }
  }

  private async vm(
    code: string,
    event: PubSubRedemptionMessage
  ): Promise<string> {
    const vm = new VM({
      timeout: 5000,
      sandbox: { event }
    })

    return vm.run(`(function(){return\`${code}\`})()`)
  }
}
