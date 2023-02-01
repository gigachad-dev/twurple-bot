import type { TwurpleClient, ChatMessage } from '../client'
import { BaseCommand } from '../client'

export default class Emotes extends BaseCommand {
  constructor(client: TwurpleClient) {
    super(client, {
      name: 'emotes',
      userlevel: 'watcher',
      description: 'Включение/выключение смайликов на экране',
      aliases: ['смайлы'],
      examples: [
        'emotes on',
        'emotes off'
      ]
    })
  }

  async prepareRun(msg: ChatMessage, args: string[]): Promise<void> {
    if(!args.length)
      return
    switch(args[0]){
      case 'on':
        msg.say('!eon')
        break
      case 'off':
        msg.say('!eoff')
    }
  }


}
