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
    const { gameId, gameName } = await this.client.api.channels.getChannelInfo(msg.channel.id)
    const { data } = await this.client.api.streams.getStreams({
      game: gameId,
      language: 'ru',
      type: 'live',
      limit: 100
    })

    const streams = data.filter(stream => stream.userId !== msg.channel.id)

    if (streams.length) {
      const { userName } = streams[randomInt(0, streams.length - 1)]
      msg.say(`/raid ${userName}`)
    } else {
      msg.reply(`Стримов в разделе ${gameName} не найдено`)
    }
  }
}