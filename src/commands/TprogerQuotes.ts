import { randomInt, declOfNum } from '../utils'
import { TwurpleClient, BaseCommand, ChatMessage } from '../index'
import quotes from '../config/quotes.json'

export default class TprogerQuotes extends BaseCommand {
  private quotes: string[]

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

    this.quotes = quotes
  }

  async run(msg: ChatMessage, { number }): Promise<void> {
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
      const dbInfo = `Всего в базе ${this.quotes.length} ${declOfNum(this.quotes.length, ['цитата', 'цитат', 'цитат'])}.`
      msg.reply(`Цитата не найдена! ${dbInfo}`)
    }
  }

  random(msg: ChatMessage): void {
    let number = randomInt(0, this.quotes.length - 1)
    msg.actionSay(`#${++number}: ${this.getQuote(number)}`)
  }

  getQuote(i: number): string {
    return this.quotes[i]
  }
}