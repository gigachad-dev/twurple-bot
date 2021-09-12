import path from 'path'
import Lowdb from 'lowdb'
import { TwurpleClient, BaseCommand, ChatMessage } from '../index'

interface IPlan {
  plan: string
}

export default class Plan extends BaseCommand {
  private db: Lowdb.LowdbSync<IPlan>

  constructor(client: TwurpleClient) {
    super(client, {
      name: 'plan',
      userlevel: 'everyone',
      aliases: [
        'план'
      ]
    })

    this.db = this.client.lowdbAdapter<IPlan>({
      path: path.join(__dirname, '../../config/plan.json')
    })
  }

  async prepareRun(msg: ChatMessage, args: string[]): Promise<void> {
    if (msg.author.isMods && args.length) {
      this.changePlan(msg, args)
    } else {
      this.printPlan(msg)
    }
  }

  changePlan(msg: ChatMessage, args: string[]): void {
    const plan = args.join(' ')
    this.db.assign({ plan }).write()
    msg.reply(`План стрима изменен: ${plan}`)
  }

  printPlan(msg: ChatMessage): void {
    msg.reply(this.db.get('plan').value() || 'План стрима отсутствует')
  }
}