import path from 'path'
import lodash from 'lodash'
import { readdirSync } from 'fs'
import { EventEmitter } from 'events'
import { LowSync, JSONFileSync } from 'lowdb'
import StrictEventEmitter from 'strict-event-emitter-types'

import { ApiClient } from '@twurple/api'
import { ChatUserstate, Client } from '@twurple/auth-tmi'
import { AccessToken, RefreshConfig, RefreshingAuthProvider } from '@twurple/auth'

import { Logger } from './Logger'
import { BaseCommand } from './BaseCommand'
import { ChatMessage, ChatterState } from './ChatMessage'
import { CommandArguments, CommandParser } from './CommandParser'
import { Server } from '../server'

export type TwurpleTokens = AccessToken & Omit<RefreshConfig, 'onRefresh'>

export interface TwurpleConfig extends TwurpleTokens {
  channels: string[]
  botOwners: string[]
  ignoreList: string[]
  prefix: string
  server: {
    hostname: string
    port: number
  }
}

export interface TwurpleOptions {
  config: string
  commands: string
}

export interface TwurpleEvents {
  message: (msg: ChatMessage) => void
}

type TwurpleEmitter = StrictEventEmitter<EventEmitter, TwurpleEvents>

export class TwurpleClient extends (EventEmitter as { new(): TwurpleEmitter }) {
  public config: TwurpleConfig
  public tmi: Client
  public auth: RefreshingAuthProvider
  public api: ApiClient
  public commands: BaseCommand[]
  public logger: typeof Logger

  private options: TwurpleOptions
  private parser: typeof CommandParser
  private db: LowSync<TwurpleConfig>
  private server: Server

  constructor(options: TwurpleOptions) {
    super()

    this.options = options
    this.commands = []
    this.logger = Logger
    this.parser = CommandParser

    this.db = this.lowdbAdapter<TwurpleConfig>({
      path: options.config
    })

    this.logger.info('Loading config file..')

    const defaultConfig = {
      prefix: '!',
      botOwners: [],
      ignoreList: [],
      server: {
        hostname: 'localhost',
        port: 3000
      }
    } as const

    this.config = Object.assign(defaultConfig, this.db.data)

    this.auth = new RefreshingAuthProvider(
      {
        clientId: this.config.clientId,
        clientSecret: this.config.clientSecret,
        onRefresh: (tokens) => this.updateTokens(tokens)
      },
      this.db.data
    )

    this.server = new Server(this)

    this.server.app.listen(this.config.server.port, this.config.server.hostname, () => {
      this.logger.warn(`Server now listening on http://${this.config.server.hostname}:${this.config.server.port}`)

      this.auth.refresh().then(() => {
        this.connect()
      }).catch(() => {
        this.logger.info(`Login with twitch http://${this.config.server.hostname}:${this.config.server.port}/twitch/auth`)
      })
    })
  }

  updateTokens(tokens: AccessToken) {
    this.logger.info('Refreshing auth tokens..')
    Object.assign(this.db.data, tokens)
    this.db.write()
  }

  async connect(): Promise<void> {
    this.registerCommands()

    this.logger.info('Current default prefix is ' + this.config.prefix)

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
    this.tmi.on('raided', this.onRaid.bind(this))

    await this.tmi.connect()
  }

  private registerCommands(): void {
    readdirSync(this.options.commands)
      .filter(file => !file.includes('.d.ts'))
      .forEach(file => {
        let commandFile = require(path.join(this.options.commands, file))

        if (typeof commandFile.default === 'function') {
          commandFile = commandFile.default
        }

        if (commandFile.prototype instanceof BaseCommand) {
          const command: BaseCommand = new commandFile(this)
          this.logger.info(`Register command ${command.options.name}`)
          this.commands.push(command)
        } else {
          this.logger.warn(`${file} is not an instance of BaseCommand`)
        }
      }, this)
  }

  private async onMessage(channel: string, userstate: ChatUserstate, messageText: string, self: boolean): Promise<void> {
    if (self) {
      return
    }

    if (this.config.ignoreList.includes(userstate.username)) {
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

  private onRaid(channel: string, username: string, viewers: number): void {
    this.say(channel, `${username} проводит рейд в количестве ${viewers} ${viewers ? 'зрителя' : 'зрителей'} KonCha`)
  }

  findCommand(parserResult: Partial<CommandArguments>): BaseCommand | undefined {
    return this.commands.find(command => {
      if (command.options.aliases?.includes(parserResult.command)) {
        return command
      }

      if (parserResult.command === command.options.name) {
        return command
      }
    })
  }

  execCommand(command: string, msg: ChatMessage): void {
    const cmd = this.findCommand({ command })

    if (cmd.constructor.prototype.hasOwnProperty('execute')) {
      cmd.execute(msg)
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

  lowdbAdapter<T extends object>(opts: { path: string, initialData?: T }): LowSync<T> {
    const db = new LowSync<T>(
      new JSONFileSync(opts.path)
    )

    db.read()

    if (!db.data && opts.initialData) {
      this.logger.info(`Writing initial data to file: ${opts.path}`)
      Object.assign(db, { data: opts.initialData })
    } else if (!db.data) {
      Object.assign(db, { data: {} })
    }

    db.chain = lodash.chain(db.data)
    db.write()

    return db
  }
}