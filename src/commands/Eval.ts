import { vm } from '../utils'
import { TwurpleClient, BaseCommand, ChatMessage } from '../client'

export default class Eval extends BaseCommand {
  constructor(client: TwurpleClient) {
    super(client, {
      name: 'eval',
      userlevel: 'regular'
    })
  }

  async prepareRun(msg: ChatMessage, args: string[]): Promise<void> {
    const result = await vm(args.join(' '))
    msg.say(result)
  }
}