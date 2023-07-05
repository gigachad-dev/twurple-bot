import got from 'got'
import { BaseCommand } from '../client'
import type { ChatMessage, TwurpleClient } from '../client'

interface WeatherApiResponse {
  id: number
  name: string
  weather: {
    description: string
  }[]
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
  sys: {
    country: string
  }
}

export default class Weather extends BaseCommand {
  private key: string

  constructor(client: TwurpleClient) {
    super(client, {
      name: 'weather',
      userlevel: 'everyone',
      description: 'Поиск погоды через openweathermap.org',
      aliases: ['погода'],
      examples: ['weather <location>']
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
        const query = args.join(' ')
        const { body } = await got<WeatherApiResponse>(
          `https://api.openweathermap.org/data/2.5/weather?appid=${
            this.key
          }&lang=ru&units=metric&q=${encodeURI(query)}`,
          { responseType: 'json' }
        )

        const { name, main, clouds, wind, sys } = body
        const celsius = main.temp.toFixed(1)
        const weather = body.weather
          .map(({ description }) => {
            return description.charAt(0).toUpperCase() + description.slice(1)
          })
          .join(', ')

        msg.reply(
          `${name} (${sys.country}): ${weather}, 🌡️ ${celsius}°C, ☁️ ${clouds.all}%, 💦 ${main.humidity}%, 💨 ${wind.speed}m/sec`
        )
      } catch (err) {
        msg.reply('Город не найден')
      }
    } else {
      msg.reply('Укажите город')
    }
  }
}
