import path from 'path'
import Lowdb from 'lowdb'
import { TwurpleClient, BaseCommand, ChatMessage } from '../index'
import migration from '../migrations/automod.json'

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
      hideFromHelp: true,
      botChannelOnly: true
    })

    this.db = this.client.lowdbAdapter<IAutoMod>({
      path: path.join(__dirname, '../../config/automod.json'),
      initialData: migration
    })
  }

  async prepareRun(msg: ChatMessage, args: string[]): Promise<void> {
    if (args.length > 1) {
      const action = args[0]
      args.shift()
      const word = args.join(' ')

      switch (action) {
        case 'add':
          this.addWord(msg, word)
          break

        case 'remove':
          this.removeWord(msg, word)
          break

        default:
          msg.reply(`Action argument ${action} not found`)
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

  addWord(msg: ChatMessage, word: string): void {
    if (!this.findWord(word)) {
      this.db
        .get('ban_words')
        .push(word)
        .write()

      msg.reply('Rule successfully added VoteYea')
    } else {
      msg.reply('Rule already exists VoteNay')
    }
  }

  removeWord(msg: ChatMessage, word: string): void {
    if (this.findWord(word)) {
      this.db
        .get('ban_words')
        .remove(v => v === word)
        .write()

      msg.reply('Rule successfully deleted VoteYea')
    } else {
      msg.reply('Rule not found VoteNay')
    }
  }

  toggleAutoMod(msg: ChatMessage): void {
    const isEnabled = !this.db.get('enabled').value()
    this.db.assign({ enabled: isEnabled }).write()
    msg.reply(`AutoMod is turned ${isEnabled ? 'on VoteYea' : 'off VoteNay'}`)
  }

  async execute(msg: ChatMessage): Promise<void> {
    if (this.db.get('enabled').value()) {
      const message = msg.text.toLowerCase()

      this.db
        .get('ban_words')
        .value()
        .find(async (word) => {
          if (message.indexOf(word) > -1) {
            const { total } = await this.client.api.users.getFollows({
              user: msg.author.id,
              followedUser: msg.channel.id
            })

            if (total) {
              if ((msg.author.isVip || msg.author.isSubscriber) && !msg.author.isMods) {
                return this.client.tmi.deletemessage(msg.channel.name, msg.id)
              }

              return this.client.tmi.timeout(msg.channel.name, msg.author.username, 600, `Reason: ${word}`)
            } else {
              return this.client.tmi.ban(msg.channel.name, msg.author.username, `Banned: ${word}`)
            }
          }
        })
    }
  }
}