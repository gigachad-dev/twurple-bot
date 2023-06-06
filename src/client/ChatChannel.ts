export interface OriginalMessage {
  channel: string
  room_id: string
}

export class ChatChannel {
  constructor(private originalMessage: OriginalMessage) {}

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
