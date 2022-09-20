import { BaseCommand } from '../client'
import { randomInt } from '../utils/randomInt'
import type { TwurpleClient, ChatMessage } from '../client'
import type { HelixUser, HelixUserRelation } from '@twurple/api/lib'

interface Channel {
  id: string
  name: string
}

interface PayloadVip {
  claimed: HelixUser | null
  target: HelixUser | HelixUserRelation | null
  channel: Channel
}

export default class Vip extends BaseCommand {
  constructor(client: TwurpleClient) {
    super(client, {
      name: 'vip',
      userlevel: 'regular'
    })
  }

  async prepareRun(msg: ChatMessage, args: string[]): Promise<any> {
    const claimedUsername = this.removeMention(args[0])
    const targetUsername = this.removeMention(args[1])
    const payload: PayloadVip = {
      claimed: null,
      target: null,
      channel: msg.channel
    }

    try {
      if (claimedUsername) {
        const claimedUser = await this.getUserByName(claimedUsername)
        payload.claimed = claimedUser
      }

      if (targetUsername) {
        const targetUser = await this.getUserByName(targetUsername)
        if (!targetUser) {
          throw new Error(`@${payload.claimed.name} пользователь с никнейном "${targetUsername}" не найден`)
        }
        payload.target = targetUser
      }

      if (await this.checkForVips(payload.channel, payload.claimed.id)) {
        throw new Error(`@${payload.claimed.name} ты уже имеешь VIP`)
      }

      if (args.length > 1) {
        const targetIsVip = await this.checkForVips(payload.channel, payload.target.id)
        if (targetIsVip) {
          this.claimVipByUsername(payload)
        } else {
          throw new Error(`@${payload.target.name} пользователь @${payload.target.name} не имеет VIP`)
        }
      } else {
        this.claimRandomVip(payload)
      }
    } catch (err) {
      msg.actionSay(err.message)
    }
  }

  private async claimVipByUsername(
    { channel, claimed, target }: PayloadVip
  ): Promise<void> {
    this.addVip(channel, claimed, target)
  }

  private async claimRandomVip(
    { channel, claimed }: PayloadVip
  ): Promise<void> {
    const vips = await this.getVips(channel)
    const randomVip = vips[randomInt(0, vips.length - 1)]
    this.addVip(channel, claimed, randomVip)
  }

  private async unVip(
    ch: Channel, user: HelixUser | HelixUserRelation
  ): Promise<void> {
    this.client.api.channels.removeVip(ch, user.id)
  }

  private async addVip(
    ch: Channel, claimed: HelixUser, target: HelixUser | HelixUserRelation
  ): Promise<void> {
    await this.unVip(ch, target)
    await this.client.api.channels.addVip(ch.id, claimed.id)
    this.client.say(
      ch.name,
      `@${claimed.name} украл EZ VIP у @${target.name} D:`
    )
  }

  private async getVips(ch: Channel): Promise<HelixUserRelation[]> {
    const vips = await this.client.api.channels.getVips(
      ch.id,
      { limit: 100 }
    )

    return vips.data
  }

  private async checkForVips(ch: Channel, userId: string): Promise<boolean> {
    return await this.client.api.channels
      .checkVipForUser(ch.id, userId)
  }

  private async getUserByName(username: string): Promise<HelixUser> {
    return await this.client.api.users.getUserByName(username)
  }

  private removeMention(username: string): string {
    return username.startsWith('@') ? username.slice(1) : username
  }
}
