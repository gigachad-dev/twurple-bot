import { decode } from 'html-entities'
import { randomInt } from '../utils'
import search, { YouTubeSearchResults } from 'youtube-search'
import { TwurpleClient, BaseCommand, ChatMessage } from '../index'

export default class RandomGachi extends BaseCommand {
  private orders: string[]
  private blacklist: string[]
  private words: string[]
  private result: YouTubeSearchResults
  private history: string[]

  constructor(client: TwurpleClient) {
    super(client, {
      name: 'gachi',
      userlevel: 'regular',
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
  }

  async run(msg: ChatMessage): Promise<void> {
    const term = this.words[randomInt(0, this.words.length - 1)]
    const opts = {
      maxResults: 50,
      order: this.orders[randomInt(0, this.orders.length - 1)],
      key: process.env.YOUTUBE_KEY
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