import got from 'got'
import { randomInt } from '../utils'
import { ChatMessage } from './ChatMessage'
import { TwurpleClient } from './TwurpleClient'

interface ChattersApiResponse {
  chatter_count: number
  chatters: {
    broadcaster: string[]
    vips: string[]
    moderators: string[]
    staff: string[]
    admins: string[]
    global_mods: string[]
    viewers: string[]
  }
}

export class CommandVariables {
  constructor(
    private client: TwurpleClient,
    private msg: ChatMessage
  ) { }

  get user() {
    return this.msg.author
  }

  get channel() {
    return this.msg.channel
  }

  random(min: number, max: number) {
    return randomInt(min, max)
  }

  // TODO: Async variables
  // async chatter() {
  //   const { body } = await got<ChattersApiResponse>(
  //     `https://tmi.twitch.tv/group/user/${this.msg.channel.name}/chatters`,
  //     { responseType: 'json' }
  //   )

  //   const chatters = [
  //     ...body.chatters.broadcaster,
  //     ...body.chatters.vips,
  //     ...body.chatters.moderators.filter(user => !this.client.config.ignoreList.includes(user)),
  //     ...body.chatters.viewers
  //   ]

  //   return chatters[randomInt(0, chatters.length - 1)]
  // }
}