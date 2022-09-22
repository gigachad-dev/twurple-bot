import { BaseCommand } from '../client'
import type { TwurpleClient } from '../client'
import type { PubSubRedemptionMessage } from '@twurple/pubsub/lib'

export default class Timeout extends BaseCommand {
  constructor(client: TwurpleClient) {
    super(client, {
      name: 'timeout',
      userlevel: 'regular',
      args: [
        {
          type: String,
          name: 'username',
          prepare(value: string) {
            return value.startsWith('@') ? value.slice(1) : value
          }
        },
        {
          type: Number,
          name: 'ms'
        }
      ]
    })
  }

  async onPubSub(event: PubSubRedemptionMessage): Promise<void> {
    const [username] = event.message.split(' ')
    const channel = this.client.getUsername()

    try {
      const user = await this.client.api.users.getUserByName(username)
      if (!user) {
        this.client.say(
          channel,
          `@${event.userName} пользователь "${username}" не найден`
        )
        return
      }

      const moderators = await this.client.tmi.mods(channel)
      if (!moderators.includes(user.name) && channel !== user.name) {
        this.say(`/timeout ${user.name} 600`)
      } else {
        this.say(`@${event.userName} Запрещено отстранять модераторов и стримера (-15K KEKU)`)
      }
    } catch (err) {
      this.say(err.messsage)
    }
  }

  private say(message: string): void {
    const username = this.client.getUsername()
    this.client.say(username, message)
  }
}
