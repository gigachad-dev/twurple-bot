import got from 'got'
import type { TwurpleClient, ChatMessage } from '../client'
import { BaseCommand } from '../client'

interface WeatherApiResponse {
  id: number
  name: string
  main: {
    humidity: number
    temp: number
  }
  clouds: {
    all: number
  }
  wind: {
    speed: number
  }
}

export default class Weather extends BaseCommand {
  private key: string

  constructor(client: TwurpleClient) {
    super(client, {
      name: 'weather',
      userlevel: 'everyone',
      description: 'Поиск погоды через openweathermap.org',
      aliases: [
        'погода'
      ],
      examples: [
        'weather <location>'
      ]
    })

    this.key = process.env.WEATHER_KEY
  }

  async prepareRun(msg: ChatMessage, args: string[]): Promise<void> {
    if (!this.key) {
      return this.client.logger.error(
        'Please define the WEATHER_KEY environment variable inside .env',
        this.constructor.name
      )
    }

    if (args.length) {
      try {
        const query = args.join('%20')
        // TODO: Refactor bullshit!
        // eslint-disable-next-line no-useless-escape
        const replaced = query.replace(/[&\/\\#,+()$~.':*?<>{}=]/g, '')

        if (query !== replaced) {
          throw new Error()
        }

        const { body } = await got<WeatherApiResponse>(
          `https://api.openweathermap.org/data/2.5/weather?appid=${this.key}&lang=ru&units=metric&q=${query}`,
          { responseType: 'json' }
        )

        msg.reply(`${body.name} ${Math.round(body.main.temp)}°C Подробнее: openweathermap.org/city/${body.id}`)
      } catch (err) {
        msg.reply('Город не найден')
      }
    } else {
      msg.reply('Укажите город')
    }
  }
}
