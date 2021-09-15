import { dateDiff } from '../utils'
import { TwurpleClient, BaseCommand, ChatMessage } from '../index'

export default class Uptime extends BaseCommand {
  constructor(client: TwurpleClient) {
    super(client, {
      name: 'uptime',
      userlevel: 'everyone',
      description: 'Продолжительность трансляции',
      aliases: [
        'аптайм'
      ],
      args: [
        {
          type: String,
          name: 'username'
        }
      ]
    })
  }

  async run(msg: ChatMessage, { username }: { username: string }): Promise<void> {
    const channel = msg.channel.name
    const stream = await (
      await this.client.api.users.getUserByName(username || channel)
    ).getStream()

    if (stream) {
      const dates = dateDiff(stream.startDate)
      const time = Object.entries(dates)
        .map(date => {
          if (date[1] > 0) {
            return date[1] + date[0].charAt(0)
          }
        })
        .filter(v => v !== undefined)
        .join(' ')

      msg.reply(`${stream.userDisplayName} вещает ${time}`)
    } else {
      msg.reply(`${channel} не в сети`)
    }
  }
}