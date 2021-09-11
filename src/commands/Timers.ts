import path from 'path'
import Lowdb from 'lowdb'
import FileSync from 'lowdb/adapters/FileSync'
import { TwurpleClient, BaseCommand, ChatMessage } from '../index'

export interface TimerMessages {
  time: string
  message: string
  interval: NodeJS.Timeout
}

export type ITimers = Record<string, TimerMessages>

export default class Timers extends BaseCommand {
  messages: Lowdb.LowdbSync<ITimers[]>

  constructor(client: TwurpleClient) {
    super(client, {
      name: 'timers',
      userlevel: 'regular',
      hideFromHelp: true
    })

    this.messages = Lowdb(
      new FileSync<ITimers[]>(
        path.join(__dirname, '../../config/timers.json')
      )
    )

    const channels = this.client.config.channels.map(channel => {
      return {
        [channel.replace('#', '')]: []
      }
    })

    this.messages.defaults(...channels).write()
  }

  async prepareRun(msg: ChatMessage, args: string[]): Promise<void> { }

  async execute(msg: ChatMessage): Promise<void> { }
}