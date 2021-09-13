import path from 'path'
import { LowSync } from 'lowdb'
import { randomInt, declOfNum } from '../utils'
import { TwurpleClient, BaseCommand, ChatMessage } from '../index'

export default class TprogerQuotes extends BaseCommand {
  private quotes: LowSync<string[]>

  constructor(client: TwurpleClient) {
    super(client, {
      name: 'quote',
      userlevel: 'everyone',
      aliases: [
        'цитата'
      ],
      description: 'Цитаты с TProger',
      args: [
        {
          type: Number,
          name: 'number'
        }
      ]
    })

    this.quotes = this.client.lowdbAdapter<string[]>({
      path: path.join(__dirname, '../../config/quotes.json')
    })
  }

  async run(msg: ChatMessage, { number }: { number: number }): Promise<void> {
    if (number && !isNaN(number)) {
      this.search(msg, --number)
    } else {
      this.random(msg)
    }
  }

  search(msg: ChatMessage, number: number): void {
    const quote = this.getQuote(number)

    if (quote) {
      msg.actionSay(`#${++number}: ${quote}`)
    } else {
      const count = this.quotes.data.length
      msg.reply(`Цитата не найдена! Всего в базе ${count} ${declOfNum(count, ['цитата', 'цитат', 'цитат'])}.`)
    }
  }

  random(msg: ChatMessage): void {
    let number = randomInt(0, this.quotes.data.length - 1)
    msg.actionSay(`#${++number}: ${this.getQuote(number)}`)
  }

  getQuote(index: number): string {
    return this.quotes.data[index]
  }
}