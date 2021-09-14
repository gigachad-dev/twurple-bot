import path from 'path'
import { LowSync } from 'lowdb'
import { TwurpleClient, BaseCommand, ChatMessage } from '../index'

export interface ITimerMessages {
  time: string
  message: string
  interval: NodeJS.Timeout
}

export type ITimers = Record<string, ITimerMessages>

export default class Timers extends BaseCommand {
  messages: LowSync<ITimers[]>

  constructor(client: TwurpleClient) {
    super(client, {
      name: 'timers',
      userlevel: 'regular',
      hideFromHelp: true
    })

    this.messages = this.client.lowdbAdapter<ITimers[]>({
      path: path.join(__dirname, '../../config/timers.json')
    })
  }

  async prepareRun(msg: ChatMessage, args: string[]): Promise<void> { }

  async execute(msg: ChatMessage): Promise<void> { }
}