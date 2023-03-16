import { BaseCommand } from '../client'
import { randomInt } from '../utils/randomInt'
import type { TwurpleClient } from '../client'
import type { HelixUser, HelixUserRelation } from '@twurple/api/lib'
import type { PubSubRedemptionMessage } from '@twurple/pubsub/lib'

interface PayloadVip {
  claimed: HelixUser | null
  target: HelixUser | HelixUserRelation | null
  channel: HelixUser
}

const MAX_VIPS = 50

export default class Vip extends BaseCommand {
  constructor(client: TwurpleClient) {
    super(client, {
      name: 'vip',
      userlevel: 'regular'
    })
  }

  async onPubSub(event: PubSubRedemptionMessage): Promise<void> {
    const payload: PayloadVip = {
      claimed: null,
      target: null,
      channel: await this.client.api.users.getMe()
    }

    try {
      payload.claimed = await this.getUserByName(event.userName)

      const isVip = await this.checkForVips(payload.channel, payload.claimed.id)
      if (isVip) {
        throw new Error(`@${payload.claimed.name} ты уже имеешь VIP`)
      }

      this.claimVip(payload)
    } catch (err) {
      this.client.say(payload.channel.name, err.message)
    }
  }

  private async claimVip(
    { channel, claimed }: PayloadVip
  ): Promise<void> {
    const vips = await this.getVips(channel)

    if (vips.length === MAX_VIPS) {
      const randomVip = vips[randomInt(0, vips.length - 1)]
      this.addVip(channel, claimed, randomVip)
    } else if (vips.length > MAX_VIPS || vips.length < MAX_VIPS) {
      await this.client.api.chat.sendAnnouncement(
        channel.id,
        channel.id,
        { message: `@${channel.displayName} Лимит VIP-ов был увеличен` }
      )

      await this.client.api.channels.addVip(channel.id, claimed.id)
    }
  }

  private async unVip(
    channel: HelixUser, user: HelixUser | HelixUserRelation
  ): Promise<void> {
    this.client.api.channels.removeVip(channel, user.id)
  }

  private async addVip(
    channel: HelixUser,
    claimed: HelixUser,
    target: HelixUser | HelixUserRelation
  ): Promise<void> {
    await this.unVip(channel, target)
    await this.client.api.channels.addVip(channel.id, claimed.id)
    await this.client.api.chat.sendAnnouncement(
      channel.id,
      channel.id,
      {
        message: `EZ ${claimed.name} украл VIP у ${target.name} D:`,
        color: 'orange'
      }
    )
  }

  private async getVips(channel: HelixUser): Promise<HelixUserRelation[]> {
    const vips = await this.client.api.channels.getVips(
      channel.id,
      { limit: 100 }
    )

    return vips.data
  }

  private async checkForVips(channel: HelixUser, userId: string): Promise<boolean> {
    return await this.client.api.channels
      .checkVipForUser(channel.id, userId)
  }

  private async getUserByName(username: string): Promise<HelixUser> {
    return await this.client.api.users.getUserByName(username)
  }
}
