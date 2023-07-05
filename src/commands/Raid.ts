import { BaseCommand } from '../client'
import { randomInt } from '../utils'
import type { ChatMessage, TwurpleClient } from '../client'

export default class Raid extends BaseCommand {
  constructor(client: TwurpleClient) {
    super(client, {
      name: 'raid',
      userlevel: 'regular',
      hideFromHelp: true
    })
  }

  async run(msg: ChatMessage): Promise<void> {
    const stream = await this.client.api.streams.getStreamByUserId(
      msg.channel.id
    )

    if (!stream) {
      msg.reply('Канал не в сети.')
      return
    }

    const { data } = await this.client.api.streams.getStreams({
      game: stream.gameId,
      language: 'ru',
      type: 'live',
      limit: 100
    })

    const streams = data.filter((stream) => stream.userId !== msg.channel.id)
    if (!streams.length) {
      msg.reply(`Стримов в категории ${stream.gameName} не найдено.`)
      return
    }

    const randomStream = streams[randomInt(0, streams.length - 1)]

    this.client.api.raids
      .startRaid(msg.channel.id, randomStream.id)
      .then(() => {
        msg.say(
          `Проводим рейд в количестве Baby ${stream.viewers} зрителей Baby на канал twitch.tv/${randomStream.userName}`
        )
      })
      .catch(() => {
        msg.say(`Рейды на канале ${randomStream.userDisplayName} отключены.`)
      })
  }
}
