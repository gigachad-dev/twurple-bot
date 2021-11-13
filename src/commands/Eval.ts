import { vm } from '../utils'
import { TwurpleClient, BaseCommand, ChatMessage, CommandVariables } from '../client'

export default class Eval extends BaseCommand {
  constructor(client: TwurpleClient) {
    super(client, {
      name: 'eval',
      userlevel: 'regular'
    })
  }

  async prepareRun(msg: ChatMessage, args: string[]): Promise<void> {
    const code = args.join(' ')
    const variables = new CommandVariables(this.client, msg)
    const result = await vm(code, variables)
    msg.say(result)
  }
}