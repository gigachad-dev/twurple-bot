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

  async prepareRun(msg: ChatMessage, args: string[]): Promise<void> {
    if (args.length > 1) {
      const action = args[0]
      args.shift()
      const word = args.join(' ')

      switch (action) {
        case 'add':
          this.addWord(word)
          break

        case 'remove':
          this.removeWord(word)
          break

        default:
          msg.reply(`Action argument "${action}" not found`)
      }
    } else {
      this.toggleAutoMod(msg)
    }
  }

  findWord(word: string): string | undefined {
    return this.db
      .get('ban_words')
      .value()
      .find(v => v === word)
  }

  addWord(word: string): void {
    if (!this.findWord(word)) {
      this.db
        .get('ban_words')
        .push(word)
        .write()
    }
  }

  removeWord(word: string): void {
    if (this.findWord(word)) {
      this.db
        .get('ban_words')
        .remove(v => v === word)
        .write()
    }
  }

  toggleAutoMod(msg: ChatMessage): void {
    const isEnabled = !this.db.get('enabled').value()
    this.db.assign({ enabled: isEnabled }).write()
    msg.reply(`AutoMod is turned ${isEnabled ? 'on' : 'off'}`)
  }

  async execute(msg: ChatMessage): Promise<void> {
    if (this.db.get('enabled').value()) {
      this.db
        .get('ban_words')
        .value()
        .find(word => {
          if (msg.text.indexOf(word) > -1) {
            this.client.tmi.ban(msg.channel.name, msg.author.username, `Banned for "${word}" AutoMod by @VS_Code`)
          }
        })
    }
  }
}