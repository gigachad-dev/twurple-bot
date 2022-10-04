import { BaseCommand } from '../client'
import type { TwurpleClient } from '../client'
import type { PubSubRedemptionMessage } from '@twurple/pubsub/lib'

export default class Timeout extends BaseCommand {
  constructor(client: TwurpleClient) {
    super(client, {
      name: 'timeout',
      userlevel: 'regular'
    })
  }

  private parseArgs(value: string): string {
    return value.startsWith('@') ? value.slice(1) : value
  }

  async onPubSub(event: PubSubRedemptionMessage): Promise<void> {
    const username = this.parseArgs(event.message.split(' ')[0])
    const channel = this.client.getUsername()

    try {
      const user = await this.client.api.users.getUserByName(username)
      if (!user) {
        this.client.say(channel, `@${event.userName} пользователь "${username}" не найден`)
        return
      }

      const moderators = await this.client.tmi.mods(channel)
      if (!moderators.includes(user.name) && channel !== user.name) {
        this.client.say(channel, `/timeout ${user.name} 600`)
      } else {
        this.client.say(channel, `@${event.userName} Запрещено отстранять модераторов и стримера (-15K KEKU)`)
      }
    } catch (err) {
      this.client.say(username, '-15K KEKU')
    }
  }
}
