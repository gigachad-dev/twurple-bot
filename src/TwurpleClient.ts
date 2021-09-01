import winston from 'winston'
import EventEmitter from 'events'
import { PathLike, promises as fs } from 'fs'
import readdir from 'recursive-readdir-sync'

import { ApiClient } from '@twurple/api'
import { ChatUserstate, Client } from '@twurple/auth-tmi'
import { AccessToken, RefreshConfig, RefreshingAuthProvider } from '@twurple/auth'

import { ClientLogger } from './ClientLogger'
import { ChatMessage } from './ChatMessage'
import { BaseCommand } from './BaseCommand'
import { CommandArguments, CommandParser } from './CommandParser'
import path from 'path'

type TwurpleConfig = AccessToken & Omit<RefreshConfig, 'onRefresh'>
export type ChatterState = ChatUserstate & { message: string }

interface TwurpleOptions {
  prefix?: string,
  verboseLogging?: boolean
  autoJoinBotChannel?: boolean
  botOwners?: string[],
  pathConfig: PathLike | fs.FileHandle
  channels: string[]
}

export class TwurpleClient extends EventEmitter {
  public config: TwurpleConfig
  public options: TwurpleOptions

  public tmi: Client
  public auth: RefreshingAuthProvider
  public api: ApiClient
  public commands: BaseCommand[]
  public logger: winston.Logger

  private parser: CommandParser

  constructor(options: TwurpleOptions) {
    super()

    const defaultOptions = {
      prefix: '!',
      verboseLogging: false,
      autoJoinBotChannel: false,
      botOwners: []
    }

    this.options = Object.assign(defaultOptions, options)
    this.parser = new CommandParser()
    this.logger = new ClientLogger().getLogger('main')
    this.commands = []
  }

  private async loadConfig() {
    try {
      this.config = JSON.parse(
        await fs.readFile(this.options.pathConfig, {
          encoding: 'utf-8'
        })
      )
    } catch (err) {
      this.logger.error(err)
    }
  }

  private async refreshConfig(tokens: AccessToken) {
    const newTokens = {
      clientId: this.config.clientId,
      clientSecret: this.config.clientSecret,
      ...tokens
    }

    await fs.writeFile(
      this.options.pathConfig,
      JSON.stringify(newTokens, null, 2),
      { encoding: 'utf-8' }
    )
  }

  async connect() {
    await this.loadConfig()

    this.logger.info('Current default prefix is ' + this.options.prefix)
    this.logger.info('Connecting to Twitch Chat')

    this.auth = new RefreshingAuthProvider(
      {
        clientId: this.config.clientId,
        clientSecret: this.config.clientSecret,
        onRefresh: async (tokens) => await this.refreshConfig(tokens)
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
      channels: this.options.channels,
      logger: this.logger
    })

    this.tmi.on('message', this.onMessage.bind(this))

    await this.tmi.connect()
  }

  registerDefaultCommands(): void {
    this.registerCommandsIn(path.join(__dirname, './commands'))
  }

  registerCommandsIn(path: string): void {
    const files = readdir(path)

    files.forEach((file: string) => {
      if (!file.match('.*(?<!\.d\.ts)$')) {
        return
      }

      let commandFile = require(file)

      if (typeof commandFile.default === 'function') {
        commandFile = commandFile.default
      }

      if (typeof commandFile === 'function') {
        const command = new commandFile(this)
        this.logger.info(`Register command ${command.options.name}`)
        this.commands.push(command)
      } else {
        this.logger.warn('You are not export default class correctly!')
      }
    }, this)
  }

  private async onMessage(channel: string, userstate: ChatUserstate, messageText: string, self: boolean): Promise<void> {
    if (self) return

    const chatter = { ...userstate, message: messageText } as ChatterState
    const msg = new ChatMessage(chatter, channel, this)

    if (msg.author.username === this.getUsername()) {
      if (!(msg.author.isBroadcaster ||
        msg.author.isModerator ||
        msg.author.isVip
      )) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    this.emit('message', msg)

    const parserResult = this.parser.parse(messageText, this.options.prefix)

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

  findCommand(parserResult: CommandArguments): BaseCommand {
    return this.commands.find(command => {
      if (command.options.aliases?.includes(parserResult.command)) {
        return command
      }

      if (parserResult.command === command.options.name) {
        return command
      }
    })
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
}