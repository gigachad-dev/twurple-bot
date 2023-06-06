import path from 'path'
import type { LowSync } from 'lowdb-hybrid'
import type { ChildProcess } from 'child_process'
import { exec, spawn } from 'child_process'
import { ChatUser } from '../client'
import type { UserLevel , TwurpleClient, ChatMessage } from '../client'
import { BaseCommand } from '../client'
import { ClearMsg } from '@twurple/chat/lib'
import { markAsUntransferable } from 'worker_threads'
import Game from './Game'
import type TextCommandManager from './TextCommand'

interface IPlayingTts{
  cp: ChildProcess
  cmd: string
}

interface ITtsSettings{
  speed?: number
  volume?: number
  voice?: string
}

interface IUser extends ITtsSettings{
  id: string
  nickname: string
}

interface ITextToSpeech {
  minSpeed: number
  speed: number
  volume: number
  voice: string
  users: IUser[]
}

export default class Watching extends BaseCommand {
  constructor(client: TwurpleClient) {
    super(client, {
      name: 'watching',
      userlevel: 'broadcaster',
      description: 'Режим просмотра, с выдачей права отключать tts, sound и emotewall заказавшему',
      aliases: ['просмотр'],
      examples: [
        'watching',
        'watching <chattername>',
        'watching <chattername> <moviename>',
        'watching reset'
      ]
    })
  }

  async prepareRun(msg: ChatMessage, args: string[]) {
    if (args.length) {
      switch(args[0]){
        case 'reset': this.client.config.watcher = ''
          return
      }

      const watcher = args[0].replace('@', '')
      this.client.config.watcher = watcher.toLowerCase()
      const filmName = args.slice(1)?.join(' ')
      if (filmName) {
        msg.say(`!commands edit смотрим ${filmName}`)
      }
      msg.say(`Смотрим фильм${filmName ? ' '+filmName : '' }! @${watcher}, теперь тебе доступны команды 
      !sounds on/off, !tts on/off, !emotes on/off. Приятного просмотра!`)
      msg.say('!game Just Chatting')
    } else {
      msg.reply(this.client.config.watcher ? `Фильмовожатый: ${this.client.config.watcher}` : 'Фильм не смотрим PoroSad')
    }
  }
}
