import { ApiClient, HelixUser } from '@twurple/api'
import { RefreshingAuthProvider } from '@twurple/auth'
import { Client } from '@twurple/auth-tmi'
import { EventEmitter } from 'events'
import { readdirSync } from 'fs'
import got from 'got'
import lodash from 'lodash'
import { JSONFileSync, LowSync } from 'lowdb-hybrid'
import path from 'path'
import { Server } from '../server'
import { BaseCommand } from './BaseCommand'
import { ChatMessage } from './ChatMessage'
import { CommandParser } from './CommandParser'
import { EventSubClient } from './EventSubClient'
import { Logger } from './Logger'
import { PubSubClient } from './PubSubClient'
import type { ChatterState } from './ChatMessage'
import type { CommandArguments } from './CommandParser'
import type { AccessToken, RefreshConfig } from '@twurple/auth'
import type { ChatUserstate } from '@twurple/auth-tmi'
import type StrictEventEmitter from 'strict-event-emitter-types'

export type TwurpleTokens = AccessToken & Omit<RefreshConfig, 'onRefresh'>

export interface TwurpleConfig extends TwurpleTokens {
  channels: string[]
  botOwners: string[]
  ignoreList: string[]
  bots: string[]
  prefix: string
  server: {
    hostname: string
    port: number
  }
  watcher: string
}

export interface TwurpleOptions {
  config: string
  commands: string
}

export interface TwurpleEvents {
  message: (msg: ChatMessage) => void
}

type TwurpleEmitter = StrictEventEmitter<EventEmitter, TwurpleEvents>

export class TwurpleClient extends (EventEmitter as {
  new (): TwurpleEmitter
}) {
  public channel: HelixUser
  public config: TwurpleConfig
  public tmi: Client
  public auth: RefreshingAuthProvider
  public api: ApiClient
  public pubsub: PubSubClient
  public eventsub: EventSubClient
  public commands: BaseCommand[]
  public logger: typeof Logger
  public db: LowSync<TwurpleConfig>

  private options: TwurpleOptions
  private parser: typeof CommandParser
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
      scope: [
        'analytics:read:extensions',
        'user:edit',
        'user:read:email',
        'clips:edit',
        'bits:read',
        'analytics:read:games',
        'user:edit:broadcast',
        'user:read:broadcast',
        'chat:read',
        'chat:edit',
        'channel:moderate',
        'channel:read:subscriptions',
        'whispers:read',
        'whispers:edit',
        'moderation:read',
        'channel:read:redemptions',
        'channel:edit:commercial',
        'channel:read:hype_train',
        'channel:read:stream_key',
        'channel:manage:extensions',
        'channel:manage:broadcast',
        'user:edit:follows',
        'channel:manage:redemptions',
        'channel:read:editors',
        'channel:manage:videos',
        'user:read:blocked_users',
        'user:manage:blocked_users',
        'user:read:subscriptions',
        'user:read:follows',
        'channel:manage:polls',
        'channel:manage:predictions',
        'channel:read:polls',
        'channel:read:predictions',
        'moderator:manage:automod',
        'channel:manage:schedule',
        'channel:read:goals',
        'moderator:read:automod_settings',
        'moderator:manage:automod_settings',
        'moderator:manage:banned_users',
        'moderator:read:blocked_terms',
        'moderator:manage:blocked_terms',
        'moderator:read:chat_settings',
        'moderator:manage:chat_settings',
        'channel:manage:raids',
        'moderator:manage:announcements',
        'moderator:manage:chat_messages',
        'user:manage:chat_color',
        'channel:manage:moderators',
        'channel:read:vips',
        'channel:manage:vips',
        'user:manage:whispers',
        'channel:read:charity',
        'moderator:read:chatters',
        'moderator:read:shield_mode',
        'moderator:manage:shield_mode',
        'moderator:read:shoutouts',
        'moderator:manage:shoutouts',
        'moderator:read:followers',
        'channel:read:guest_star',
        'channel:manage:guest_star',
        'moderator:read:guest_star',
        'moderator:manage:guest_star'
      ],
      server: {
        hostname: 'localhost',
        port: 3000
      }
    } as const

    this.config = Object.assign(defaultConfig, this.db.data)

    this.auth = new RefreshingAuthProvider({
      clientId: this.config.clientId,
      clientSecret: this.config.clientSecret,
      onRefresh: (userId, newTokenData) => {
        this.logger.info('Token refreshed for ' + userId)
        this.updateConfig(newTokenData)
      },
      onRefreshFailure: (userId) =>
        this.logger.info(
          `Login with twitch http://${this.config.server.hostname}:${this.config.server.port}/twitch/auth`
        )
    })

    this.server = new Server(this)

    this.server.app.listen(
      this.config.server.port,
      this.config.server.hostname,
      async () => {
        this.logger.info(
          `Server now listening on http://${this.config.server.hostname}:${this.config.server.port}`
        )
      }
    )

    if (!this.db.data.accessToken) {
      this.logger.info(
        `Login with twitch http://${this.config.server.hostname}:${this.config.server.port}/twitch/auth`
      )
      return
    }

    this.connect()
  }

  updateConfig(config: Partial<TwurpleConfig>) {
    Object.assign(this.db.data, config)
    this.db.write()
  }

  async connect(): Promise<void> {
    await this.auth.addUserForToken(this.db.data, ['chat'])

    this.registerCommands()

    this.logger.info('Current default prefix is ' + this.config.prefix)

    this.api = new ApiClient({
      authProvider: this.auth,
      logger: {
        timestamps: true,
        colors: true,
        emoji: true,
        minLevel: 0
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

    this.channel = await this.api.users.getUserByName(
      this.db.data.channels[0].replace('#', '')
    )

    this.logger.info('Connecting to PubSub..')
    this.pubsub = new PubSubClient(this)
    await this.pubsub.connect()

    this.logger.info('Connecting to EventSub..')
    this.eventsub = new EventSubClient(this)
    await this.eventsub.connect()

    this.logger.info('Connecting to Twitch IRC..')
    this.tmi.on('raided', this.onRaid.bind(this))
    this.tmi.on('message', this.onMessage.bind(this))
    await this.tmi.connect()

    await this.loadTwitchBots()
  }

  private registerCommands(): void {
    readdirSync(this.options.commands)
      .filter((file) => !file.includes('.d.ts'))
      .forEach((file) => {
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

  private async onMessage(
    channel: string,
    userstate: ChatUserstate,
    messageText: string,
    self: boolean
  ): Promise<void> {
    if (self) {
      return
    }

    if (this.db.data.ignoreList.includes(userstate.username)) {
      return
    }

    const chatter = { ...userstate, message: messageText } as ChatterState
    const msg = new ChatMessage(this, chatter, channel)

    if (msg.author.username === this.getUsername()) {
      if (
        !(
          msg.author.isBroadcaster ||
          msg.author.isModerator ||
          msg.author.isVip
        )
      ) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
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
    this.say(
      channel,
      `${username} проводит рейд в количестве ${viewers} ${
        viewers === 1 ? 'зрителя' : 'зрителей'
      } KonCha`
    )
  }

  findCommand(
    parserResult: Partial<CommandArguments>
  ): BaseCommand | undefined {
    return this.commands.find((command) => {
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

  lowdbAdapter<T extends object>(opts: {
    path: string
    initialData?: T
    merge?: Array<keyof T>
  }): LowSync<T> {
    const db = new LowSync<T>(new JSONFileSync(opts.path))

    db.read()

    if (!db.data && opts.initialData) {
      this.logger.info(`Writing initial data to file: ${opts.path}`)
      Object.assign(db, { data: opts.initialData })
    } else if (!db.data) {
      Object.assign(db, { data: {} })
    }

    if (opts.merge) {
      for (const key of opts.merge) {
        if (typeof db.data[key] === 'object') {
          lodash(db.data)
            .keyBy(key)
            .merge(lodash.keyBy(opts.initialData, key))
            .values()
            .value()
        } else {
          db.data[key] = opts.initialData[key]
        }
      }
    }

    db.chain = lodash.chain(db.data)
    db.write()

    return db
  }

  async loadTwitchBots() {
    try {
      this.logger.info('Loading current online twitch viewer bots..')

      const { body } = await got<{ bots: [string, number, number][] }>(
        'https://api.twitchinsights.net/v1/bots/online',
        { responseType: 'json' }
      )

      this.config.bots = body.bots.map((bot) => bot[0])
    } catch (err) {
      console.log(err)
    }
  }
}
