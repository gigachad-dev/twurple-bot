import { AccessToken, RefreshConfig, RefreshingAuthProvider } from '@twurple/auth'
import { ChatClient } from '@twurple/chat'
import { ApiClient } from '@twurple/api'
import { PathLike, promises as fs } from 'fs'
import { CommandParser } from './utils/CommandParser'

type TwurpleConfig = AccessToken & Omit<RefreshConfig, 'onRefresh'>

interface TwurpleOptions {
  config: PathLike | fs.FileHandle
  channels: string[]
}

export class TwurpleBot {
  private _config: TwurpleConfig
  private _options: TwurpleOptions

  private auth: RefreshingAuthProvider
  private chat: ChatClient
  private api: ApiClient

  private parser: CommandParser

  constructor(options: TwurpleOptions) {
    this._options = options
    this.parser = new CommandParser()
  }

  private async loadConfig() {
    try {
      this._config = JSON.parse(
        await fs.readFile(this._options.config, {
          encoding: 'utf-8'
        })
      )
    } catch (err) {
      console.log(err)
    }
  }

  private async refreshConfig(tokens: AccessToken) {
    const newTokens = {
      clientId: this._config.clientId,
      clientSecret: this._config.clientSecret,
      ...tokens
    }

    await fs.writeFile(
      this._options.config,
      JSON.stringify(newTokens, null, 2),
      { encoding: 'utf-8' }
    )
  }

  async connect() {
    await this.loadConfig()

    this.auth = new RefreshingAuthProvider(
      {
        clientId: this._config.clientId,
        clientSecret: this._config.clientSecret,
        onRefresh: async (tokens) => await this.refreshConfig(tokens)
      },
      this._config
    )

    const logger = {
      timestamps: true,
      colors: true,
      emoji: true,
      minLevel: 3
    }

    this.api = new ApiClient({
      authProvider: this.auth,
      logger
    })

    this.chat = new ChatClient({
      logger,
      isAlwaysMod: true,
      authProvider: this.auth,
      channels: this._options.channels
    })

    await this.chat.connect()

    this.chat.onMessage(async (channel, user, message, msg) => {
      const parsed = this.parser.parse(message, '!')

      if (parsed) {
        switch (parsed.command) {
          case 'uptime':
            await this.uptime(channel, parsed.args)
            break
        }
      }
    })
  }

  async uptime(channel: string, args: string[]) {
    const stream = await (
      await this.api.users.getUserByName(
        args.length ? args[0] : channel.slice(1))
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

      this.chat.say(channel, `${stream.userDisplayName} online ${formatDate.join(' ')}`)
    } else {
      this.chat.say(channel, `${args[0] || channel.slice(1)} is currently offline`)
    }
  }

  dateDiff(startDate: string | number | Date) {
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