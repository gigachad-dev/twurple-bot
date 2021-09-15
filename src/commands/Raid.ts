import { randomInt } from '../utils'
import { TwurpleClient, BaseCommand, ChatMessage } from '../index'

export default class Raid extends BaseCommand {
  constructor(client: TwurpleClient) {
    super(client, {
      name: 'raid',
      userlevel: 'regular',
      hideFromHelp: true
    })
  }

  async run(msg: ChatMessage): Promise<void> {
    const { gameId, gameName, viewers } = await this.client.api.streams.getStreamByUserId(msg.channel.id)
    const { data } = await this.client.api.streams.getStreams({
      game: gameId,
      language: 'ru',
      type: 'live',
      limit: 100
    })

    const streams = data.filter(stream => stream.userId !== msg.channel.id)

    if (streams.length) {
      if (msg.author.isMods) {
        const { userName } = streams[randomInt(0, streams.length - 1)]
        msg.say(`Проводим рейд в количестве ${viewers} зрителей на канал ${userName}`)
        msg.say(`/raid ${userName}`)
      } else {
        msg.reply('У вас недостаточно прав')
      }
    } else {
      msg.reply(`Стримов в разделе ${gameName} не найдено`)
    }
  }
}