import { ChatMessage } from './ChatMessage'
import { TwurpleClient } from './TwurpleClient'

export interface CommandOptions {
  /**
   * Command name (default alias)
   */
  name: string

  /**
   * Userlevel access (everyone, regular, vip, subscriber, moderator, broadcaster)
   */
  userlevel: keyof typeof UserLevel

  /**
   * Command description (required for output to !help <command>)
   */
  description?: string

  /**
   * Command examples (requited for output to !help <command>)
   */
  examples?: string[]

  /**
   * Command arguments
   */
  args?: CommandArgument[]

  /**
   * More aliases
   */
  aliases?: string[]

  /**
   * Hide command help output to `!commands`
   */
  hideFromHelp?: boolean

  /**
   * The command is available only in the private message of the bot
   */
  privmsgOnly?: boolean

  /**
  * The command is available only on the bot channel
  */
  botChannelOnly?: boolean

  /**
   * TextCommand
   */
  message?: string
  sendType?: keyof typeof MessageType
}

export interface CommandArgument {
  /**
   * Alias name
   */
  name: string

  /**
   * Value typesafe
   */
  type: StringConstructor | NumberConstructor | BooleanConstructor

  /**
   * Default value
   */
  defaultValue?: string | number | boolean

  /**
   * Prepare value
   */
  prepare?: (value: unknown, msg?: ChatMessage) => string | number | boolean | void
}

export enum UserLevel {
  vip = 'vip',
  everyone = 'everyone',
  regular = 'regular',
  subscriber = 'subscriber',
  moderator = 'moderator',
  broadcaster = 'broadcaster'
}

export enum MessageType {
  reply = 'reply',
  actionReply = 'actionReply',
  say = 'say',
  actionSay = 'actionSay'
}

export type NamedParameters = Record<string, string | number | boolean>

export type CommandProvider = Record<string, CommandOptions>

export class BaseCommand {
  constructor(
    public client: TwurpleClient,
    public options: CommandOptions
  ) { }

  /**
   * Method called when execCommand()
   *
   * @param msg
   * @param chatter
   */
  async execute(msg: ChatMessage): Promise<any> { }

  /**
   * Method called when command is executed
   *
   * @param msg
   * @param parameters
   */
  async run(msg: ChatMessage, parameters: unknown): Promise<any> { }

  /**
   * Prepare the command to be executed
   *
   * @param msg
   * @param parameters
   */
  async prepareRun(msg: ChatMessage, parameters: string[]): Promise<any> {
    const namedParameters: NamedParameters = {}

    if (this.options.args && this.options.args.length > 0) {
      for (let i = 0; i < this.options.args.length; i++) {
        const args = this.options.args[i]

        if (parameters[i]) {
          if (args.type) {
            namedParameters[args.name] = args.type(parameters[i])
          }

          if (args.prepare) {
            const preparedValue = args.prepare(namedParameters[args.name] || parameters[i])

            if (preparedValue) {
              namedParameters[args.name] = preparedValue
            }
          }
        } else {
          if (args.defaultValue) {
            namedParameters[args.name] = args.defaultValue
          } else {
            namedParameters[args.name] = null
          }
        }
      }
    }

    await this.run(msg, namedParameters)
  }

  /**
   * Pre validation before to known if can execute command
   *
   * @param msg
   */
  preValidate(msg: ChatMessage): string | boolean {
    if (msg.messageType !== 'whisper' && this.options.privmsgOnly) {
      return 'This command is available only via private message'
    }

    if (this.options.botChannelOnly) {
      if (msg.channel.name !== this.client.getUsername()) {
        return 'This command can be executed only in the bot channel'
      }
    }

    if (this.options.userlevel === UserLevel.everyone) {
      return true
    }

    let validationPassed = false

    if (msg.author.isBroadcaster) {
      validationPassed = true
    }

    if (msg.author.isModerator) {
      validationPassed = true
    }

    if (this.options.userlevel === UserLevel.regular) {
      if (
        msg.channel.name !== this.client.getUsername() ||
        !this.client.config.botOwners.includes(msg.author.username)
      ) {
        return 'This command can be executed only from bot owners'
      }
    }

    if (this.options.userlevel === UserLevel.subscriber) {
      if (!validationPassed && !msg.author.isSubscriber) {
        return 'This command can be executed only from the subscribers'
      }
    }

    if (this.options.userlevel === UserLevel.vip) {
      if (!validationPassed && !msg.author.isVip) {
        return 'This command can be executed only from the vips'
      }
    }

    if (this.options.userlevel === UserLevel.moderator) {
      if (!validationPassed) {
        return 'This command can be executed only from the broadcaster'
      }
    }

    if (this.options.userlevel === UserLevel.broadcaster) {
      if (!msg.author.isBroadcaster) {
        return 'This command can be executed only from a mod or the broadcaster'
      }
    }

    return true
  }
}