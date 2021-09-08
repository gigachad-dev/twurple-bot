import { ChatUser } from './ChatUser'
import { ChatChannel } from './ChatChannel'
import { TwurpleClient } from './TwurpleClient'
import { ChatUserstate, CommonUserstate } from '@twurple/auth-tmi'

export type ChatterState = ChatUserstate & { message: string }

export class ChatMessage {
  private client: TwurpleClient
  private originalMessage: ChatterState
  private _channel: ChatChannel
  private _author: ChatUser
  private _timestamp: Date

  constructor(client: TwurpleClient, originalMessage: ChatterState, channel: string) {
    this.client = client
    this.originalMessage = originalMessage
    this._channel = new ChatChannel({ channel, room_id: originalMessage['room-id'] })
    this._author = new ChatUser(originalMessage, client)
    this._timestamp = new Date()
  }

  /**
   * Text of the message
   */
  get text(): string {
    return this.originalMessage.message
  }

  /**
   * The author of the message
   */
  get author(): ChatUser {
    return this._author
  }

  /**
   * The ID of the message
   */
  get id(): string {
    return this.originalMessage.id
  }

  /**
   * The channel where the message has been sent in
   */
  get channel(): ChatChannel {
    return this._channel
  }

  /**
   * Text color
   */
  get color(): string {
    return this.originalMessage.color
  }

  /**
   * Emotes contained in the message
   */
  get emotes(): CommonUserstate['emotes'] {
    return this.originalMessage.emotes
  }

  /**
   * Message sent date
   */
  get timestamp(): Date {
    return this._timestamp
  }

  /**
   * Message type
   */
  get messageType(): ChatUserstate['message-type'] {
    return this.originalMessage['message-type']
  }

  /**
   * Helper method to reply quickly to a message. Create a message to send in the channel with @author <text>
   *
   * @param text
   */
  async reply(text: string): Promise<[string, string] | [string]> {
    if (this.messageType === 'whisper') {
      return this.client.whisper(this.author.username, text)
    } else {
      return this.client.say(this.channel.name, `@${this.author.displayName}, ${text}`)
    }
  }

  /**
   * Helper method to reply quickly to a message with an action
   *
   * @param text
   */
  async actionReply(text: string): Promise<[string]> {
    return this.client.action(this.channel.name, `@${this.author.displayName}, ${text}`)
  }

  /**
   * Helper method to send message
   *
   * @param text
   */
  async say(text: string): Promise<[string]> {
    return this.client.say(this.channel.name, text)
  }

  /**
   * Helper method to a message with an action
   *
   * @param text
   */
  async actionSay(text: string): Promise<[string]> {
    return this.client.action(this.channel.name, text)
  }
}