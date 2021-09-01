import { TwurpleClient } from './TwurpleClient'

export interface OriginalMessage {
  channel: string
  room_id?: string
}

export class ChatChannel {
  private originalMessage: OriginalMessage
  private client: TwurpleClient

  constructor(originalMessage: OriginalMessage, client: TwurpleClient) {
    this.originalMessage = originalMessage
    this.client = client
  }

  /**
   * Get channel name
   */
  get name(): string {
    return this.originalMessage.channel.slice(1)
  }

  /**
   * Get room_id
   */
  get id(): string {
    return this.originalMessage.room_id
  }
}