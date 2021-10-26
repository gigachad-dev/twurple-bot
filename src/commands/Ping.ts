import { TwurpleClient, BaseCommand, ChatMessage } from '../client'

export default class Ping extends BaseCommand {
  static int: NodeJS.Timeout
  static target: string
  static here = false

  private channel = 'le_xot'

  constructor(client: TwurpleClient) {
    super(client, {
      name: 'ping',
      userlevel: 'regular',
      args: [
        {
          name: 'action',
          type: String
        },
        {
          name: 'channel',
          type: String
        }
      ]
    })
  }

  async run(msg: ChatMessage, { action, channel }: { action: string, channel: string }): Promise<void> {
    switch (action) {
      case 'start':
        if (channel) {
          this.interval()
          Ping.here = false
          Ping.target = channel.toLowerCase()
        }
        break
      case 'stop':
        this.stop()
        break
      default:
        break
    }
  }

  interval() {
    if (!Ping.int) {
      this.client.say(this.channel, `Внеплановая проверка! ${Ping.target} тут? На ответ дается 10 секунд lexot1Good`)
        .then(() => {
          this.intervalToBan()
        })
    }
  }

  stop() {
    clearInterval(Ping.int)
    Ping.int = null
  }

  intervalToBan() {
    setTimeout(() => {
      if (!Ping.here) {
        this.ban()
        this.stop()
      } else {
        this.client.say(this.channel, `${Ping.target}, Проверка пройдена!`)
        this.stop()
      }
    }, 1000 * 10)
  }

  ban() {
    this.client.say(this.channel, `/ban ${Ping.target}`)
    this.client.say(this.channel, `${Ping.target} не найден KEKL`)
  }
}