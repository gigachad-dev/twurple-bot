import got from 'got'
import FormData from 'form-data'
import type { TwurpleClient, ChatMessage } from '../client'
import { BaseCommand } from '../client'

interface QuoteApiResponse {
  quoteLink: string
  quoteText: string
  quoteAuthor: string
}

export default class Aphorism extends BaseCommand {
  constructor(client: TwurpleClient) {
    super(client, {
      name: 'aphorism',
      userlevel: 'everyone',
      description: 'Случайный афоризм, цитата или фраза',
      aliases: [
        'афоризм'
      ]
    })
  }

  async run(msg: ChatMessage): Promise<void> {
    try {
      const form = new FormData()
      form.append('method', 'getQuote')
      form.append('format', 'json')
      form.append('param', 'ms')
      form.append('lang', 'ru')

      const { body } = await got.post<QuoteApiResponse>(
        'https://forismatic.com/api/1.0/',
        {
          body: form,
          responseType: 'json'
        }
      )

      msg.actionSay(`${body.quoteText} ${body.quoteAuthor}`)
    } catch (err) {
      this.client.logger.error(err, this.constructor.name)
    }
  }
}
