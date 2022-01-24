import path from 'path'
import migration from '../migrations/automod.json'
import { BaseCommand } from '../client'
import type { LowSync } from 'lowdb-hybrid'
import type { TwurpleClient, ChatMessage } from '../client'

interface IAutoMod {
  enabled: boolean
  silence: boolean
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
      initialData: migration,
      merge: ['rules']
    })
  }

  async prepareRun(msg: ChatMessage, args: string[]): Promise<void> {
    if (args.length > 1) {
      const action = args[0]
      args.shift()
      const word = args.join(' ').toLowerCase()

      switch (action) {
        case 'add':
          this.addWord(msg, word)
          break
        case 'remove':
          this.removeWord(msg, word)
          break
        default:
          msg.reply(`Аргумент "${action}" не найден`)
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

  async execute(msg: ChatMessage): Promise<void> {
    if (this.db.data.enabled) {
      const message = msg.text.toLowerCase()
      const word = this.db.data.rules.find(word => message.indexOf(word) !== -1)

      if (word) {
        const { total } = await this.client.api.users.getFollows({
          user: msg.author.id,
          followedUser: msg.channel.id
        })

        if (total) {
          if ((msg.author.isVip || msg.author.isSubscriber)) {
            this.client.tmi.deletemessage(msg.channel.name, msg.id)
              .then(() => this.banMessage(msg, word))
              .catch((err) => this.client.logger.error(err))
          } else {
            this.client.tmi.timeout(msg.channel.name, msg.author.username, 600)
              .then(() => this.banMessage(msg, word))
          }
        } else {
          this.client.tmi.ban(msg.channel.name, msg.author.username)
            .then(() => this.banMessage(msg, word))
        }
      }
    }
  }

  banMessage(msg: ChatMessage, word: string) {
    if (!this.db.data.silence) {
      msg.reply(`Отлетаешь по причине: ${word.slice(0, 2) + '*'.repeat(word.length - 2)} OSFrog`)
    }
  }
}
