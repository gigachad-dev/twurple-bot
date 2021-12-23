import { dateDiff } from '../utils'
import type { TwurpleClient, ChatMessage } from '../client'
import { BaseCommand } from '../client'

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
    const channel = username || msg.channel.name
    const stream = await (
      await this.client.api.users.getUserByName(channel)
    )?.getStream()

    if (stream) {
      const time = this.formatTime(stream.startDate)
      msg.reply(`${stream.userDisplayName} вещает ${time}`)
    } else {
      msg.reply(`${channel} не в сети`)
    }
  }

  formatTime(startDate: Date): string {
    const { hours, minutes, seconds } = dateDiff(startDate)

    return Object
      .entries({ 'ч.': hours, 'мин.': minutes, 'сек.': seconds })
      .filter(date => date[1] !== 0)
      .map(date => `${date[1]} ${date[0]}`)
      .join(' ')
  }
}
