import { ChatMessage } from './ChatMessage'
import { TwurpleClient } from './TwurpleClient'
import { BaseCommand, CommandOptions } from './BaseCommand'

export class TextCommand extends BaseCommand {
  constructor(client: TwurpleClient, options: CommandOptions) {
    super(client, options)
  }

  async run(msg: ChatMessage) {
    msg[this.options.sendType](this.options.message)
  }
}