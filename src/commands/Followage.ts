import { BaseCommand } from '../client'
import { dateDiff, declOfNum } from '../utils'
import type { ChatMessage, TwurpleClient } from '../client'

export default class Followage extends BaseCommand {
  constructor(client: TwurpleClient) {
    super(client, {
      name: 'followage',
      userlevel: 'everyone',
      description: 'Время отслеживания канала',
      aliases: ['олд'],
      examples: ['followage', 'followage <username>'],
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

  async run(
    msg: ChatMessage,
    { username }: { username: string }
  ): Promise<void> {
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
    const { formatDate, days } = this.formatDate(creationDate)
    msg.reply(`Стример родился ${formatDate} (${days})`)
  }

  async followByUsername(msg: ChatMessage, username: string): Promise<void> {
    try {
      const { id, displayName } = await this.getUserInfo(username)
      const { total, user } = await this.getFollows(id, msg.channel.id)

      if (total) {
        const { formatDate, days } = this.formatDate(user.followDate)
        msg.reply(`${displayName} отслеживает канал с ${formatDate} (${days})`)
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
      const { formatDate, days } = this.formatDate(user.followDate)
      msg.reply(`отслеживает канал с ${formatDate} (${days})`)
    } else {
      msg.reply('Подпишись на канал SMOrc')
    }
  }

  async getUserInfo(username: string) {
    return await this.client.api.users.getUserByName(username)
  }

  async getFollows(user: string, followedUser: string) {
    const { total, data } = await this.client.api.users.getFollows({
      user,
      followedUser
    })
    return {
      total,
      user: data[0]
    }
  }

  formatDate(startDate: string | number | Date) {
    const { formatDate, fullDays } = dateDiff(startDate)

    return {
      formatDate,
      days: `${fullDays} ${declOfNum(fullDays, [
        'день',
        'дня',
        'дней'
      ])}`
    }
  }
}
