import { declOfNum } from '../utils'
import { HelixFollowData } from '@twurple/api/lib'
import { TwurpleClient, BaseCommand, ChatMessage } from '../index'

interface FollowsData {
  total: number
  data: HelixFollowData[]
}

export default class Followage extends BaseCommand {
  constructor(client: TwurpleClient) {
    super(client, {
      name: 'followage',
      userlevel: 'everyone',
      aliases: [
        'олд'
      ],
      description: 'Время отслеживания канала',
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

  async run(msg: ChatMessage, { username }) {
    if (msg.author.isBroadcaster && !username) {
      this.followByBroadcaster(msg)
    } else if (username) {
      this.followByUsername(msg, username)
    } else {
      this.followByChatter(msg)
    }
  }

  async followByBroadcaster(msg: ChatMessage) {
    const { creationDate } = await this.getUserInfo(msg.channel.name)
    const { date, days } = this.formatDate(creationDate)
    msg.reply(`Стример родился ${date} (${days})`)
  }

  async followByUsername(msg: ChatMessage, username: string) {
    try {
      const userInfo = await this.getUserInfo(username)
      const followInfo = await this.getFollows(userInfo.id, msg.channel.id)

      if (followInfo.total) {
        const { date, days } = this.formatDate(followInfo.data[0].followed_at)
        msg.reply(`${userInfo.displayName} отслеживает канал с ${date} (${days})`)
      } else {
        msg.reply(`Пользователь ${userInfo.displayName} не подписан`)
      }
    } catch (err) {
      msg.reply(`Пользователь ${username} не найден`)
    }
  }

  async followByChatter(msg: ChatMessage) {
    const follows = await this.getFollows(msg.author.id, msg.channel.id)

    if (follows.total) {
      const { date, days } = this.formatDate(follows.data[0].followed_at)
      msg.reply(`отслеживает канал с ${date} (${days})`)
    } else {
      msg.reply(`Подпишись на канал SMOrc`)
    }
  }

  async getUserInfo(username: string) {
    return await this.client.api.users.getUserByName(username)
  }

  async getFollows(from_id: string, to_id: string) {
    return await this.client.api.callApi<FollowsData>({
      type: 'helix',
      url: 'users/follows',
      query: {
        to_id,
        from_id
      }
    })
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