import { BaseCommand } from '../client'
import type { TwurpleClient, ChatMessage } from '../client'

interface CommandArgs {
  username: string
  ms: number
}

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

  async run(msg: ChatMessage, { username, ms }: CommandArgs): Promise<any> {
    try {
      const user = await this.client.api.users.getUserByName(username)
      if (!user) return msg.actionReply(`пользователь "${username}" не найден`)

      const moderators = await this.client.tmi.mods(msg.channel.name)
      if (!moderators.includes(user.name) && msg.channel.name !== user.name) {
        msg.say(`/timeout ${user.name} ${ms}`)
      } else {
        msg.actionSay('Запрещено отстранять модераторов и стримера (-15K KEKU)')
      }
    } catch (err) {
      msg.say(err.messsage)
    }
  }
}
