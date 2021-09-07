import { TwurpleClient, BaseCommand, ChatMessage } from '../index'

export default class Game extends BaseCommand {
  constructor(client: TwurpleClient) {
    super(client, {
      name: 'game',
      userlevel: 'everyone',
      description: 'Текущая игра стрима',
      aliases: [
        'игра'
      ],
      examples: [
        '!game',
        '!game <game>'
      ]
    })
  }

  async prepareRun(msg: ChatMessage, args: string[]): Promise<void> {
    if (msg.author.isMods && args.length) {
      this.moderator(msg, args)
    } else {
      this.everyone(msg)
    }
  }

  async moderator(msg: ChatMessage, args: string[]): Promise<void> {
    const query = args.join(' ').toLowerCase()
    const games = await this.client.api.games.getGamesByNames([query])

    if (games.length) {
      this.changeGame(msg, { gameId: games[0].id, gameName: games[0].name })
    } else {
      msg.reply('Игра не найдена')
    }
  }

  async everyone(msg: ChatMessage): Promise<void> {
    const { gameName } = await this.client.api.channels.getChannelInfo(msg.channel.id)
    msg.reply(gameName)
  }

  changeGame(msg: ChatMessage, { gameId, gameName }: { gameId: string; gameName: string }): void {
    this.client.api.channels.updateChannelInfo(msg.channel.id, {
      gameId
    }).then(() => {
      msg.reply(`Игра изменена: ${gameName}`)
    }).catch(err => {
      this.client.logger.error(err, this.constructor.name)
    })
  }
}