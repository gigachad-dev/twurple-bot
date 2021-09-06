import path from 'path'
import Lowdb from 'lowdb'
import FileSync from 'lowdb/adapters/FileSync'
import { TwurpleClient, BaseCommand, ChatMessage } from '../index'

interface IAutoMod {
  enabled: boolean
  ban_words: string[]
}

export default class AutoMod extends BaseCommand {
  private db: Lowdb.LowdbSync<IAutoMod>

  constructor(client: TwurpleClient) {
    super(client, {
      name: 'automod',
      userlevel: 'regular',
      hideFromHelp: true
    })

    const adapter = new FileSync<IAutoMod>(path.join(__dirname, '../config/automod.json'))
    this.db = Lowdb(adapter)
  }

  async run(msg: ChatMessage): Promise<void> {
    const isEnabled = !this.db.get('enabled').value()

    this.db
      .assign({ enabled: isEnabled })
      .write()

    msg.reply(`AutoMod is ${isEnabled ? 'enabled' : 'disabled'}`)
  }

  async execute(msg: ChatMessage): Promise<void> {
    if (this.db.get('enabled').value()) {
      this.db
        .get('ban_words')
        .value()
        .find(word => {
          if (msg.text.indexOf(word) > -1) {
            this.client.tmi.ban(msg.channel.name, msg.author.username, 'AutoMod by @VS_Code')
          }
        })
    }
  }
}