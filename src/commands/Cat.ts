import got from 'got'
import { randomInt } from '../utils'
import { TwurpleClient, BaseCommand, ChatMessage } from '../index'

export interface CatApiResponse {
  file: string
}

export default class Cat extends BaseCommand {
  constructor(client: TwurpleClient) {
    super(client, {
      name: 'cat',
      userlevel: 'everyone',
      aliases: [
        'кот'
      ]
    })
  }

  async run(msg: ChatMessage) {
    try {
      const { body } = await got.get<CatApiResponse>(
        'https://aws.random.cat/meow',
        {
          responseType: 'json',
          decompress: false,
          methodRewriting: false
        }
      )

      const cats = ['CoolCat', 'DxCat', 'GlitchCat']
      const emote = cats[randomInt(0, cats.length - 1)]

      msg.reply(`${emote} ${body.file.replace(/ /g, '%20')}`)
    } catch (err) {
      console.log(err)
    }
  }
}