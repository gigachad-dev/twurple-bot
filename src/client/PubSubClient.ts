import ms from 'ms'
import { VM } from 'vm2'
import { PubSubClient as PubSub } from '@twurple/pubsub'
import type { StringValue } from 'ms'
import type { TokenInfo } from '@twurple/auth/lib'
import type { TwurpleClient } from './TwurpleClient'
import type { PubSubRedemptionMessage } from '@twurple/pubsub'

interface Redemption {
  name: string
  command: string
  timeout?: {
    time: StringValue
    action: string
  }
}

export class PubSubClient {
  private pubsub: PubSub
  private tokenInfo: TokenInfo
  private redemptions: Redemption[]

  constructor(private readonly client: TwurpleClient) {
    this.redemptions = [
      {
        name: 'Заткнуть балаболку',
        command: 'tts'
      },
      {
        name: 'Украсть VIP статус',
        command: 'vip'
      },
      {
        name: 'Отстранить',
        command: 'timeout'
      },
      {
        name: 'Чат только для смайликов',
        command: '/emoteonly',
        timeout: {
          time: '5m',
          action: '/emoteonlyoff'
        }
      },
      {
        name: 'VIP статус',
        command: '/vip ${event.userName}'
      }
    ]
  }

  async connect(): Promise<void> {
    this.pubsub = new PubSub()
    this.tokenInfo = await this.client.api.getTokenInfo()

    await this.pubsub.registerUserListener(this.client.auth, this.tokenInfo.userId)
    await this.registerOnRedemtion()
  }

  private async registerOnRedemtion(): Promise<void> {
    await this.pubsub.onRedemption(this.tokenInfo.userId, (event) => {
      const redemption = this.redemptions
        .find((redemption) => redemption.name === event.rewardTitle)

      if (redemption) {
        const command = this.client.findCommand({ command: redemption.command })
        if (command) {
          command.onPubSub(event)
        } else {
          this.say(redemption, event)
        }
      }
    })
  }

  private async say(
    redemption: Redemption, event: PubSubRedemptionMessage
  ): Promise<void> {
    this.client.say(
      this.tokenInfo.userName,
      await this.vm(redemption.command, event)
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
    code: string, event: PubSubRedemptionMessage
  ): Promise<string> {
    const vm = new VM({
      timeout: 5000,
      sandbox: { event }
    })

    return vm.run(`(function(){return\`${code}\`})()`)
  }
}
