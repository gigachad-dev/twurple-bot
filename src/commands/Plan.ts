import path from 'path'
import Lowdb from 'lowdb'
import FileSync from 'lowdb/adapters/FileSync'
import { TwurpleClient, BaseCommand, ChatMessage } from '../index'

interface PlanConfig {
  plan: string
}

export default class Plan extends BaseCommand {
  private db: Lowdb.LowdbSync<PlanConfig>

  constructor(client: TwurpleClient) {
    super(client, {
      name: 'plan',
      userlevel: 'everyone',
      aliases: [
        'план'
      ]
    })

    const adapter = new FileSync<PlanConfig>(path.join(__dirname, '../config/plan.json'))
    this.db = Lowdb(adapter)
  }

  async prepareRun(msg: ChatMessage, args: string[]): Promise<void> {
    const isMod = msg.author.isBroadcaster || msg.author.isModerator

    if (isMod && args.length) {
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