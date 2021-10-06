import ms, { StringValue } from 'ms'
import path from 'path'
import { LowSync } from 'lowdb'
import { TwurpleClient, BaseCommand, ChatMessage } from '../index'

interface ITimerMessages {
  time?: StringValue
  message?: string
  interval: NodeJS.Timeout
}

interface ChannelTimers extends Omit<ITimerMessages, 'interval'> {
  channel: string
}

type ITimers = Record<string, ITimerMessages[]>

export default class Timers extends BaseCommand {
  private timers: Map<string, ITimerMessages>
  private messages: LowSync<ITimers>

  constructor(client: TwurpleClient) {
    super(client, {
      name: 'timers',
      userlevel: 'regular',
      hideFromHelp: true
    })

    const channels = {} as ITimers
    for (const channel of this.client.config.channels) {
      channels[channel.replace('#', '')] = []
    }

    this.timers = new Map<string, ITimerMessages>()
    this.messages = this.client.lowdbAdapter<ITimers>({
      path: path.join(__dirname, '../../config/timers.json'),
      initialData: channels
    })

    for (const [channel, messages] of Object.entries(this.messages.data)) {
      for (const data of messages) {
        this.registerTimer({
          channel,
          time: data.time,
          message: data.message
        })
      }
    }
  }

  private registerTimer({ channel, message, time }: ChannelTimers): void {
    if (message && time) {
      if (Number(ms(time))) {
        this.timers.set(channel, {
          time,
          message,
          interval: setInterval(() => {
            this.client.say(channel, message)
          }, ms(time))
        })
      } else {
        this.client.logger.error(`Timers: Invalid time format [${time}]`)
      }
    } else {
      this.client.logger.warn(`Timers: Property 'message' or 'timer' does not exist [${channel}]`)
    }
  }

  /**
   * TODO: Timers manager
   *
   * @param msg
   * @param args
   */
  async prepareRun(msg: ChatMessage, args: string[]): Promise<void> { }
}