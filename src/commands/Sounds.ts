import path from 'path'
import type { LowSync } from 'lowdb-hybrid'
import { play } from 'sound-play'
import { declOfNum } from '../utils'
import migration from '../migrations/sounds.json'
import type { TwurpleClient, ChatMessage } from '../client'
import { BaseCommand } from '../client'

interface IPlaySound {
  sounds: Sound[]
  options: {
    cooldown: number
    blacklist: string[]
  }
}

interface Sound {
  alias: string
  file: string
  volume: number
  used?: number
}

interface UsedBy {
  name: string
  timestamp: number
}

export default class Sounds extends BaseCommand {
  private db: LowSync<IPlaySound>
  private isPlaying: boolean
  private soundQueue: Sound[]
  private sounds: Sound[]
  private usedBy: UsedBy[]

  constructor(client: TwurpleClient) {
    super(client, {
      name: 'sounds',
      userlevel: 'everyone',
      description: 'Воспроизведение звуков на стриме',
      aliases: ['звуки']
    })

    this.db = this.client.lowdbAdapter<IPlaySound>({
      path: path.join(__dirname, '../../config/sounds.json'),
      initialData: migration
    })

    this.sounds = this.db.data.sounds
    this.isPlaying = false
    this.soundQueue = []
    this.usedBy = []
  }

  async prepareRun(msg: ChatMessage, args: string[]): Promise<void> {
    if (!args.length) {
      return this.soundsList(msg)
    }

    if (msg.author.isRegular) {
      const command = args.shift()
      const value = args.shift()

      switch (command) {
        case 'cooldown': {
          const cooldown = Number(value)
          if (isNaN(cooldown)) {
            return this.unknownArgument(msg)
          }

          this.updateCooldown(cooldown)
          break
        }
        case 'add': {
          if (!value) {
            return this.unknownArgument(msg)
          }

          this.addToBlacklist(value)
          break
        }
        case 'rm': {
          if (!value) {
            return this.unknownArgument(msg)
          }

          this.removeFromBlacklist(value)
          break
        }
        case 'volume': {
          const sound = value
          const volume = Number(args[0])

          if (!sound || isNaN(volume)) {
            return this.unknownArgument(msg)
          }

          this.updateVolume(sound, volume)
          break
        }
        case 'top': {
          const message = this.sounds.sort((a,b) => b.used - a.used)
            .slice(0,this.sounds.length < 10 ? this.sounds.length : 10)
            .map((val,index) => `${index < 3 ? String.fromCodePoint(129351+index) + ' ' : ''}${val.alias} - ${val.used}`)
          msg.reply(message.join('; '))
          break
        }
        default:
          this.unknownArgument(msg)
      }
    }
  }

  private unknownArgument(msg: ChatMessage): void {
    msg.reply('Аргумент команды не найден')
  }

  private updateCooldown(cooldown: number): void {
    this.db.data.options.cooldown = cooldown
    this.db.write()
    this.usedBy.length = 0
  }

  private addToBlacklist(username: string): void {
    this.db.data.options.blacklist = [
      ...new Set([...this.db.data.options.blacklist, username])
    ]
    this.db.write()
  }

  private removeFromBlacklist(username): void {
    const users = this.db.data.options.blacklist
      .filter((usr) => usr !== username)
    this.db.data.options.blacklist = users
    this.db.write()
  }

  private updateVolume(soundName: string, volume: number): void {
    const sound = this.db.data.sounds
      .find(({ alias }) => alias === soundName)

    if (sound) {
      Object.assign(sound, { volume })
      this.db.write()
    }
  }

  soundsList(msg: ChatMessage): void {
    const sounds = this.sounds.map(sound => `!${sound.alias}`)
    msg.reply(sounds.join(', '))
  }

  async execute(msg: ChatMessage): Promise<void> {
    const name = msg.author.displayName
    const command = msg.text.slice(1).toLowerCase()

    if (msg.text.startsWith(this.client.config.prefix) && command.length) {
      const sound = this.sounds.find(sound => {
        if (sound.alias === command) {
          return sound
        }
      })

      if (sound) {
        const { blacklist, cooldown } = this.db.data.options

        if (!msg.author.isRegular) {
          if (this.checkBlacklist(msg, name, blacklist)) {
            return
          }

          if (this.checkCooldown(msg, name, cooldown)) {
            return
          }
        }

        this.usedBy.push({
          name,
          timestamp: Math.floor(Date.now() / 1000)
        })

        this.playSound(sound)
      }
    }
  }

  checkBlacklist(msg: ChatMessage, name: string, blacklist: string[]): string {
    return blacklist.find(username => {
      if (name.toLowerCase() === username.toLowerCase()) {
        return msg.reply('Вам запрещено использовать звуки')
      }
    })
  }

  checkCooldown(msg: ChatMessage, name: string, cooldown: number): UsedBy {
    return this.usedBy.find(data => {
      if (data.name === name) {
        const time = Math.floor(Date.now() / 1000) - data.timestamp

        if (time >= cooldown) {
          this.usedBy = this.usedBy.filter(v => v.name !== name)
        } else {
          return msg.reply(`Жди ${cooldown - time} секунд${declOfNum(cooldown - time, ['у', 'ы', ''])}`)
        }
      }
    })
  }

  playSound(sound: Sound): number {
    const folder = path.join(__dirname, '../../config/sounds')
    const file = path.join(folder, `${sound.file}`)

    if (this.isPlaying) {
      return this.soundQueue.push(sound)
    }

    try {
      this.isPlaying = true

      play(file, sound.volume).then(() => {
        this.isPlaying = false
        

        if (this.soundQueue.length) {
          this.playSound(this.soundQueue.shift())
        }

        this.client.logger.info(sound.file, this.constructor.name)

        Object.assign(sound, { used: sound.used? sound.used+1 : 1 })
        this.db.write()
      })
    } catch (err) {
      this.client.logger.error(err, this.constructor.name)
    }
  }
}
