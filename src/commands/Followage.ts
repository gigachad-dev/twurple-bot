import { declOfNum } from '../utils'
import { TwurpleClient, BaseCommand, ChatMessage } from '../index'

export default class Followage extends BaseCommand {
  constructor(client: TwurpleClient) {
    super(client, {
      name: 'followage',
      userlevel: 'everyone',
      description: 'Время отслеживания канала',
      aliases: [
        'олд'
      ],
      examples: [
        `${client.options.prefix}followage`,
        `${client.options.prefix}followage <username>`
      ],
      args: [
        {
          type: String,
          name: 'username',
          prepare: (value: string) => {
            if (value.startsWith('@')) {
              return value.slice(1)
            }
          }
        }
      ]
    })
  }

  async run(msg: ChatMessage, { username }): Promise<void> {
    if (msg.author.isBroadcaster && !username) {
      this.followByBroadcaster(msg)
    } else if (username) {
      this.followByUsername(msg, username)
    } else {
      this.followByChatter(msg)
    }
  }

  async followByBroadcaster(msg: ChatMessage): Promise<void> {
    const { creationDate } = await this.getUserInfo(msg.channel.name)
    const { date, days } = this.formatDate(creationDate)
    msg.reply(`Стример родился ${date} (${days})`)
  }

  async followByUsername(msg: ChatMessage, username: string): Promise<void> {
    try {
      const { id, displayName } = await this.getUserInfo(username)
      const { total, user } = await this.getFollows(id, msg.channel.id)

      if (total) {
        const { date, days } = this.formatDate(user.followDate)
        msg.reply(`${displayName} отслеживает канал с ${date} (${days})`)
      } else {
        msg.reply(`Пользователь ${displayName} не подписан`)
      }
    } catch (err) {
      msg.reply(`Пользователь ${username} не найден`)
    }
  }

  async followByChatter(msg: ChatMessage): Promise<void> {
    const { total, user } = await this.getFollows(msg.author.id, msg.channel.id)

    if (total) {
      const { date, days } = this.formatDate(user.followDate)
      msg.reply(`отслеживает канал с ${date} (${days})`)
    } else {
      msg.reply(`Подпишись на канал SMOrc`)
    }
  }

  async getUserInfo(username: string) {
    return await this.client.api.users.getUserByName(username)
  }

  async getFollows(user: string, followedUser: string) {
    const { total, data } = await this.client.api.users.getFollows({ user, followedUser })
    return {
      total,
      user: data[0]
    }
  }

  formatDate(startDate: string | number | Date) {
    const date = new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC'
    }).format(new Date(startDate))

    const days = Math.ceil(
      (Date.now() - new Date(startDate).getTime()) /
      (1000 * 60 * 60 * 24)
    )

    return {
      date,
      days: `${days} ${declOfNum(days, ['день', 'дня', 'дней'])}`
    }
  }
}