import got from 'got'
import { randomInt } from '../utils'
import { TwurpleClient, BaseCommand, ChatMessage } from '../client'

interface GiphyApiResponse {
  data: {
    bitly_url: string
    title: string
  }[]
}

export default class Giphy extends BaseCommand {
  private key: string

  constructor(client: TwurpleClient) {
    super(client, {
      name: 'giphy',
      userlevel: 'regular'
    })

    this.key = process.env.GIPHY_KEY
  }

  async prepareRun(msg: ChatMessage, args: string[]) {
    if (!this.key) {
      return this.client.logger.error(
        'Please define the GIPHY_KEY environment variable inside .env',
        this.constructor.name
      )
    }

    try {
      if (args.length) {
        await this.search(msg, args)
      } else {
        await this.trending(msg)
      }
    } catch (err) {
      msg.reply(err)
    }
  }

  async search(msg: ChatMessage, args: string[]) {
    const query = args.join(' ')
    const { body } = await got<GiphyApiResponse>('https://api.giphy.com/v1/gifs/search', {
      responseType: 'json',
      searchParams: {
        api_key: this.key,
        q: query
      }
    })

    if (body.data.length) {
      const { bitly_url, title } = this.gif(body)
      msg.reply(`${title} → ${bitly_url}`)
    } else {
      msg.reply(`По запросу "${query}" ничего не найдено`)
    }
  }

  async trending(msg: ChatMessage) {
    const { body } = await got<GiphyApiResponse>('https://api.giphy.com/v1/gifs/trending', {
      responseType: 'json',
      searchParams: { api_key: this.key }
    })

    if (body.data.length) {
      const { bitly_url, title } = this.gif(body)
      msg.reply(`${title} → ${bitly_url}`)
    } else {
      msg.reply('Ой-ой, что-то пошло не так!')
    }
  }

  gif({ data }: GiphyApiResponse) {
    const index = randomInt(0, data.length - 1)
    const { bitly_url, title } = data[index]

    return {
      bitly_url,
      title
    }
  }
}