import _ from 'lodash'
import { clamp } from 'lodash'
import type { LowSync } from 'lowdb-hybrid'
import path from 'path'
import type { TwurpleClient, ChatMessage } from '../client'
import { BaseCommand } from '../client'


interface IParty{
  emotions: string[]
  whitelist: string[]
}

export default class Party extends BaseCommand {
  private db: LowSync<IParty>
  private emotions: string[]
  private whitelist: string[]

  constructor(client: TwurpleClient) {
    super(client, {
      name: 'party',
      userlevel: 'everyone',
      aliases: [
        'туса'
      ]
    })
    this.db = this.client.lowdbAdapter<IParty>({
      path: path.join(__dirname, '../../config/party.json')
    })
  
    this.emotions = this.db.data.emotions
    this.whitelist = _.union(this.db.data.emotions,this.db.data.whitelist)
  }

  async prepareRun(msg: ChatMessage, args: string[]): Promise<void> {
    this.generateParty(msg, args)
  }

  private generateParty(msg: ChatMessage, args: string[] ) : void{
    args = this.whitelist.filter(value => args.includes(value))
    // Select emotions
    const MAX_MSG_LENGTH = 500
    const selectedEmotes = args.length ? args : this.selectEmotes()
    
    // Generate pasta
    const subPasta = selectedEmotes.join(' ') + ' '
    const pastaLength = MAX_MSG_LENGTH / subPasta.length
    msg.say(subPasta.repeat(pastaLength))
  }

  private selectEmotes(): string[]{
    let emotes = this.emotions
    const selectedEmotes = []
    const emotesCount = Math.floor(clamp(Math.random(),0.5,1) * 6)
    for (let i=0; i < emotesCount; i++){
      const emote = emotes[Math.floor(Math.random()*this.emotions.length)]
      emotes = emotes.filter((val) => val !== emote)
      selectedEmotes.push(emote)
    }
    return selectedEmotes
  }

}
