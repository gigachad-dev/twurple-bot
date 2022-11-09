import type { TwurpleClient, ChatMessage } from '../client'
import { BaseCommand } from '../client'

export default class Title extends BaseCommand {
  constructor(client: TwurpleClient) {
    super(client, {
      name: 'title',
      userlevel: 'everyone',
      description: 'Получение/изменение название стрима',
      examples: [
        'title',
        'title <text>'
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
    const title = args.join(' ')

    if (title.length > 140) {
      msg.reply('Название стрима не может быть больше 140 символов')
    } else {
      this.changeTitle(msg, title)
    }
  }

  async everyone(msg: ChatMessage): Promise<void> {
    const { title } = await this.client.api.channels.getChannelInfo(msg.channel.id)
    msg.reply(title)
  }

  changeTitle(msg: ChatMessage, title: string): void {
    this.client.api.channels.updateChannelInfo(
      msg.channel.id,
      { title }
    ).then(() => {
      msg.reply(`Название стрима изменено: ${title}`)
    }).catch(err => {
      this.client.logger.error(err, this.constructor.name)
    })
  }
}
