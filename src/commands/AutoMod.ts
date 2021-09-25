import path from 'path'
import { LowSync } from 'lowdb'
import migration from '../migrations/automod.json'
import { TwurpleClient, BaseCommand, ChatMessage } from '../index'

interface IAutoMod {
  enabled: boolean
  rules: string[]
}

export default class AutoMod extends BaseCommand {
  private db: LowSync<IAutoMod>

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
          msg.reply(`Аргумент '${action}' не найден`)
      }
    } else {
      this.toggleAutoMod(msg)
    }
  }

  findWord(word: string): string | undefined {
    return this.db.data.rules.find(v => word === v)
  }

  addWord(msg: ChatMessage, word: string): void {
    if (!this.findWord(word)) {
      this.db.data.rules.push(word)
      this.db.write()
      msg.reply('Правило добавлено VoteYea')
    } else {
      msg.reply('Правило уже существует VoteNay')
    }
  }

  removeWord(msg: ChatMessage, word: string): void {
    if (this.findWord(word)) {
      this.db.data.rules = this.db.data.rules.filter(v => word !== v)
      this.db.write()
      msg.reply('Правило удалено VoteYea')
    } else {
      msg.reply('Правило не найдено VoteNay')
    }
  }

  toggleAutoMod(msg: ChatMessage): void {
    const isEnabled = !this.db.data.enabled
    this.db.data.enabled = isEnabled
    this.db.write()
    msg.reply(`AutoMod ${isEnabled ? 'включен VoteYea' : 'выключен VoteNay'}`)
  }

  async execute(msg: ChatMessage): Promise<[string]> {
    if (this.db.data.enabled) {
      const message = msg.text.toLowerCase()
      const includes = (value: string) => message.indexOf(value) !== -1

      if (this.db.data.rules.some(includes)) {
        const { total } = await this.client.api.users.getFollows({
          user: msg.author.id,
          followedUser: msg.channel.id
        })

        if (total) {
          if ((msg.author.isVip || msg.author.isSubscriber)) {
            return this.client.tmi.deletemessage(msg.channel.name, msg.id)
          }

          this.client.tmi.timeout(msg.channel.name, msg.author.username, 600)
        } else {
          this.client.tmi.ban(msg.channel.name, msg.author.username)
        }
      }
    }
  }
}