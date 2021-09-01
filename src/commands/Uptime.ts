import { TwurpleClient } from '../TwurpleClient'
import { ChatMessage } from '../ChatMessage'
import { BaseCommand } from '../BaseCommand'

export default class Uptime extends BaseCommand {
  constructor(client: TwurpleClient) {
    super(client, {
      name: 'uptime',
      userlevel: 'everyone',
      args: [
        {
          name: 'username'
        }
      ]
    })
  }

  async run(msg: ChatMessage, { username }): Promise<void> {
    this.uptime(msg, username)
  }

  async uptime(msg: ChatMessage, arg: string | undefined) {
    const channel = msg.channel.name.slice(1)
    const stream = await (
      await this.client.api.users.getUserByName(arg || channel)
    ).getStream()

    if (stream) {
      const dates = this.dateDiff(stream.startDate)
      const formatDate = Object.entries(dates)
        .map(date => {
          if (date[1] > 0) {
            return date[1] + date[0].charAt(0)
          }
        })
        .filter(v => v !== undefined)

      msg.reply(`${stream.userDisplayName} online ${formatDate.join(' ')}`)
    } else {
      msg.reply(`${channel} is currently offline`)
    }
  }

  private dateDiff(startDate: string | number | Date) {
    let difference = (Date.now() - new Date(startDate).getTime()) / 1000

    const timespans = {
      years: 31536000,
      months: 2592000,
      weeks: 604800,
      days: 86400,
      hours: 3600,
      minutes: 60,
      seconds: 1
    }

    let date = {} as typeof timespans

    Object.keys(timespans).forEach(i => {
      date[i] = Math.floor(difference / timespans[i])
      difference -= date[i] * timespans[i]
    })

    return date
  }
}