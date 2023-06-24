import got from 'got'
import { randomInt } from '../utils'
import type { TwurpleClient, ChatMessage } from '../client'
import { BaseCommand } from '../client'

export interface CatApiResponse {
  id: string
  created_at: string
  tags: string[]
  url: string
}

export default class Cat extends BaseCommand {
  constructor(client: TwurpleClient) {
    super(client, {
      name: 'cat',
      userlevel: 'everyone',
      description: 'Случайная картинка котейки',
      aliases: [
        'кот'
      ]
    })
  }

  async run(msg: ChatMessage): Promise<void> {
    try {
      const { body } = await got.get<CatApiResponse>(
        'https://cataas.com/cat?json=true',
        { responseType: 'json' }
      )

      const cats = ['CoolCat', 'DxCat', 'GlitchCat']
      const emote = cats[randomInt(0, cats.length - 1)]

      msg.reply(`${emote} cataas.com${body.url}`)
    } catch (err) {
      this.client.logger.error(err, this.constructor.name)
    }
  }
}