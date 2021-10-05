import search, { YouTubeSearchOptions } from 'youtube-search'
import { TwurpleClient, BaseCommand, ChatMessage } from '../index'

export default class YouTubeSearch extends BaseCommand {
  private opts: YouTubeSearchOptions

  constructor(client: TwurpleClient) {
    super(client, {
      name: 'youtube',
      userlevel: 'regular',
      description: 'Поиск видео на YouTube',
      aliases: [
        'видео'
      ],
      examples: [
        'youtube <query>'
      ]
    })

    this.opts = {
      maxResults: 1,
      key: process.env.YOUTUBE_KEY
    }
  }

  async prepareRun(msg: ChatMessage, args: string[]): Promise<void> {
    if (!this.opts.key) {
      return this.client.logger.error(
        'Please define the YOUTUBE_KEY environment variable inside .env',
        this.constructor.name
      )
    }

    if (args.length) {
      try {
        const query = args.join(' ')

        search(query, this.opts, (err, results) => {
          if (err) throw err
          msg.reply(`${results[0].title} ${results[0].link}`)
        })
      } catch (err) {
        this.client.logger.error(err, this.constructor.name)
      }
    } else {
      msg.reply('Отсутствует аргумент команды')
    }
  }
}