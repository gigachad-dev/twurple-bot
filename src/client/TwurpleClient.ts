import ms from 'ms'
import Lowdb from 'lowdb'
import FileSync from 'lowdb/adapters/FileSync'
import readdir from 'recursive-readdir-sync'
import EventEmitter from 'events'

import { ApiClient } from '@twurple/api'
import { ChatUserstate, Client } from '@twurple/auth-tmi'
import { AccessToken, RefreshConfig, RefreshingAuthProvider } from '@twurple/auth'

import { Logger } from './Logger'
import { BaseCommand } from './BaseCommand'
import { ChatMessage, ChatterState } from './ChatMessage'
import { CommandArguments, CommandParser } from './CommandParser'
import Timers, { TimerMessages } from '../commands/Timers'

export type TwurpleTokens = AccessToken & Omit<RefreshConfig, 'onRefresh'>

export interface TwurpleConfig extends TwurpleTokens {
  channels: string[]
  botOwners: string[]
  prefix: string
}

export interface TwurpleOptions {
  config: string
  commands: string
}

export class TwurpleClient extends EventEmitter {
  public config: TwurpleConfig
  public tmi: Client
  public auth: RefreshingAuthProvider
  public api: ApiClient
  public commands: BaseCommand[]
  public timers: Map<string, TimerMessages>
  public logger: typeof Logger

  private options: TwurpleOptions
  private parser: typeof CommandParser
  private db: Lowdb.LowdbSync<TwurpleConfig>

  constructor(options: TwurpleOptions) {
    super()

    this.options = options
    this.commands = []
    this.logger = Logger
    this.parser = CommandParser
    this.timers = new Map<string, TimerMessages>()

    this.db = Lowdb(new FileSync<TwurpleConfig>(options.config))
    this.logger.info('Loading config file..')
    this.config = this.db.getState()
  }

  async connect(): Promise<void> {
    this.registerCommands()
    this.registerTimers()
    this.logger.info('Current default prefix is ' + this.config.prefix)

    this.auth = new RefreshingAuthProvider(
      {
        clientId: this.config.clientId,
        clientSecret: this.config.clientSecret,
        onRefresh: (tokens) => {
          this.logger.info('Refreshing auth tokens..')
          this.db.assign(tokens).write()
        }
      },
      this.config
    )

    this.api = new ApiClient({
      authProvider: this.auth,
      logger: {
        timestamps: true,
        colors: true,
        emoji: true,
        minLevel: 3
      }
    })

    this.tmi = new Client({
      options: {
        debug: true
      },
      connection: {
        secure: true,
        reconnect: true
      },
      authProvider: this.auth,
      channels: this.config.channels,
      logger: this.logger
    })

    this.tmi.on('message', this.onMessage.bind(this))
    await this.tmi.connect()
  }

  private registerCommands(): void {
    const files = readdir(this.options.commands)

    files.forEach(file => {
      if (file.includes('.d.ts')) {
        return
      }

      let commandFile = require(file)

      if (typeof commandFile.default === 'function') {
        commandFile = commandFile.default
      }

      if (typeof commandFile === 'function') {
        const command: BaseCommand = new commandFile(this)
        this.logger.info(`Register command ${command.options.name}`)
        this.commands.push(command)
      } else {
        this.logger.warn('You are not export default class correctly!')
      }
    }, this)
  }

  private registerTimers(): void {
    const timers = this.findCommand({ command: 'timers' }) as Timers

    this.logger.info(`Register timers..`)

    for (const [channel, messages] of Object.entries(timers.messages.getState())) {
      for (const { message, time } of Object.values(messages)) {
        if (!Number(ms(time))) {
          this.logger.error(`Invalid time format [#${channel}:${message}]`)
        } else {
          this.timers.set(channel, {
            time,
            message,
            interval: setInterval(() => {
              this.say(channel, message)
            }, ms(time))
          })
        }
      }
    }
  }

  private async onMessage(channel: string, userstate: ChatUserstate, messageText: string, self: boolean): Promise<void> {
    if (self) {
      return
    }

    const chatter = { ...userstate, message: messageText } as ChatterState
    const msg = new ChatMessage(this, chatter, channel)

    if (msg.author.username === this.getUsername()) {
      if (!(msg.author.isBroadcaster || msg.author.isModerator || msg.author.isVip)) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    this.emit('message', msg)

    const parserResult = this.parser.parse(messageText, this.config.prefix)

    if (parserResult) {
      const command = this.findCommand(parserResult)

      if (command) {
        const preValidateResponse = command.preValidate(msg)

        if (typeof preValidateResponse !== 'string') {
          command.prepareRun(msg, parserResult.args)
        } else {
          msg.reply(preValidateResponse)
        }
      }
    }
  }

  findCommand(parserResult: Partial<CommandArguments>): BaseCommand {
    return this.commands.find(command => {
      if (command.options.aliases?.includes(parserResult.command)) {
        return command
      }

      if (parserResult.command === command.options.name) {
        return command
      }
    })
  }

  execCommand(command: string, msg?: ChatMessage): void {
    const cmd = this.findCommand({ command })

    if (cmd?.execute) {
      cmd.execute(msg)
    } else {
      this.logger.warn(`Command ${command} doesn't use execute() method!`)
    }
  }

  async say(channel: string, message: string): Promise<[string]> {
    return await this.tmi.say(channel, message)
  }

  async action(channel: string, message: string): Promise<[string]> {
    return await this.tmi.action(channel, message)
  }

  async whisper(username: string, message: string): Promise<[string, string]> {
    return await this.tmi.whisper(username, message)
  }

  getUsername(): string {
    return this.tmi.getUsername()
  }

  getChannels(): string[] {
    return this.tmi.getChannels()
  }
}