import { decode } from 'html-entities'
import { randomInt } from '../utils'
import type { YouTubeSearchResults } from 'youtube-search'
import search from 'youtube-search'
import type { TwurpleClient, ChatMessage } from '../client'
import { BaseCommand } from '../client'

export default class RandomGachi extends BaseCommand {
  private orders: string[]
  private blacklist: string[]
  private words: string[]
  private result: YouTubeSearchResults
  private history: string[]
  private key: string

  constructor(client: TwurpleClient) {
    super(client, {
      name: 'gachi',
      userlevel: 'regular',
      description: 'Рандомная ссылка на gachi видео',
      aliases: [
        'гачи'
      ]
    })

    this.orders = [
      'title',
      'rating',
      'relevance',
      'viewCount'
    ]

    this.blacklist = [
      'звёздные войны',
      'обращение',
      'зажигает',
      'озвучива',
      'оценива',
      'флексит',
      'реакция',
      'выбира',
      'откуда',
      'часов',
      'кавер',
      'стрим',
      'смотр',
      'слуша',
      'мема',
      'поёт'
    ]

    this.words = [
      'гачи ♂',
      'gachi ♂',
      'gachi remix ♂',
      'right version ♂',
      'gachi version ♂',
      'гачимучи ремикс ♂'
    ]

    this.history = []
    this.key = process.env.YOUTUBE_KEY
  }

  async run(msg: ChatMessage): Promise<void> {
    if (!this.key) {
      return this.client.logger.error(
        'Please define the YOUTUBE_KEY environment variable inside .env',
        this.constructor.name
      )
    }

    const term = this.words[randomInt(0, this.words.length - 1)]
    const opts = {
      maxResults: 50,
      order: this.orders[randomInt(0, this.orders.length - 1)],
      key: this.key
    }

    search(term, opts, (err, results) => {
      try {
        if (err) throw err

        do {
          this.result = results[randomInt(0, results.length - 1)]
          console.log(this.result.title)
        } while (
          this.history.some(v => this.result.link === v) ||
          (this.blacklist.some(v => this.result.title.toLowerCase().indexOf(v) > -1) && this.result.kind === 'youtube#video')
        )

        this.history.push(this.result.link)
        msg.reply(`${decode(this.result.title)} ${this.result.link}`)
      } catch (err) {
        this.client.logger.error(err, this.constructor.name)
      }
    })
  }
}
