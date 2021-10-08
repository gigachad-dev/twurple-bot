import path from 'path'
import { LowSync } from 'lowdb'
import { TwurpleClient, BaseCommand, ChatMessage } from '../client'

interface IPlan {
  plan: string
}

export default class Plan extends BaseCommand {
  private db: LowSync<IPlan>

  constructor(client: TwurpleClient) {
    super(client, {
      name: 'plan',
      userlevel: 'everyone',
      description: 'План на стрим',
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
    this.db.data.plan = plan
    this.db.write()
    msg.reply(`План стрима изменен: ${plan}`)
  }

  printPlan(msg: ChatMessage): void {
    const plan = this.db.data.plan || 'План стрима отсутствует'
    msg.reply(plan)
  }
}