import type { ChatterState } from './ChatMessage'
import type { TwurpleClient } from './TwurpleClient'
import type { Badges, CommonUserstate } from '@twurple/auth-tmi'

export class ChatUser {
  constructor(
    private originalMessage: ChatterState,
    private client: TwurpleClient
  ) { }

  /**
   * Get display-name
   */
  get displayName(): string {
    return this.originalMessage['display-name']
  }

  /**
   * Get username
   */
  get username(): string {
    return this.originalMessage.username
  }

  /**
   * Get badges
   */
  get badges(): Badges {
    return this.originalMessage.badges
  }

  /**
   * Get user-id
   */
  get id(): string {
    return this.originalMessage['user-id']
  }

  /**
   * Get user-type on string
   */
  get userType(): CommonUserstate['userType'] {
    return this.originalMessage['user-type']
  }

  /**
   * Whisper a message to the user
   * @param message
   */
  async whisper(message: string): Promise<[string, string]> {
    return this.client.whisper(this.username, message)
  }

  /**
   * Check if user is Turbo
   */
  get isTurbo(): boolean {
    return this.originalMessage.turbo
  }

  /**
   * Check if user is the channel vip
   */
  get isVip(): boolean {
    return this.badges?.vip === '1'
  }

  /**
   * Check if user is the channel broadcaster
   */
  get isBroadcaster(): boolean {
    return this.badges?.broadcaster === '1'
  }

  /**
   * Check if user is the channel subscriber
   */
  get isSubscriber(): boolean {
    return this.originalMessage.subscriber
  }

  /**
   * Check if user is the channel moderator
   */
  get isModerator(): boolean {
    return this.originalMessage.mod
  }

  /**
   * Check if user is the channel moderator or broadcaster
   */
  get isMods(): boolean {
    return this.isBroadcaster || this.isModerator
  }

  get isRegular(): boolean {
    return [
      ...this.client.config.botOwners,
      this.client.getUsername()
    ].includes(this.username)
  }
}
