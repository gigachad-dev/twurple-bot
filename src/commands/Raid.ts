import { randomInt } from '../utils'
import type { TwurpleClient, ChatMessage } from '../client'
import { BaseCommand } from '../client'

export default class Raid extends BaseCommand {
  constructor(client: TwurpleClient) {
    super(client, {
      name: 'raid',
      userlevel: 'regular',
      hideFromHelp: true
    })
  }

  async run(msg: ChatMessage): Promise<void> {
    const stream = await this.client.api.streams.getStreamByUserId(msg.channel.id)

    if (stream) {
      const { data } = await this.client.api.streams.getStreams({
        game: stream.gameId,
        language: 'ru',
        type: 'live',
        limit: 100
      })

      const streams = data.filter(stream => stream.userId !== msg.channel.id)

      if (streams.length) {
        const { userName } = streams[randomInt(0, streams.length - 1)]
        msg.say(`/raid ${userName}`)
        msg.say(`Проводим рейд в количестве ${stream.viewers} зрителей на канал twitch.tv/${userName}`)
      } else {
        msg.reply(`Стримов в разделе ${stream.gameName} не найдено`)
      }
    } else {
      msg.reply('Канал не в сети')
    }
  }
}