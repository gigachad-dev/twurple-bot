import path from 'path'
import Lowdb from 'lowdb'
import { play } from 'sound-play'
import { declOfNum } from '../utils'
import FileSync from 'lowdb/adapters/FileSync'
import { TwurpleClient, BaseCommand, ChatMessage } from '../index'
import migration from '../migrations/sounds.json'

interface PlaySoundConfig {
  options: {
    volume: number
    cooldown: number
    blacklist: string[]
  }
  sounds: Sound[]
}

interface Sound {
  alias: string
  file: string
}

interface UsedBy {
  name: string
  timestamp: number
}

interface CommandArgs {
  command: string
  value: string
}

export default class Sounds extends BaseCommand {
  private db: Lowdb.LowdbSync<PlaySoundConfig>
  private isPlaying: boolean
  private soundQueue: Sound[]
  private sounds: Sound[]
  private usedBy: UsedBy[]

  constructor(client: TwurpleClient) {
    super(client, {
      name: 'sounds',
      userlevel: 'everyone',
      description: 'Воспроизведение звуков',
      aliases: [
        'звуки'
      ],
      args: [
        {
          type: String,
          name: 'command'
        },
        {
          type: String,
          name: 'value'
        }
      ]
    })

    this.db = Lowdb(
      new FileSync<PlaySoundConfig>(
        path.join(__dirname, '../../config/sounds.json')
      )
    )

    this.db.defaults(migration).write()
    this.sounds = this.db.get('sounds').value()
    this.isPlaying = false
    this.soundQueue = []
    this.usedBy = []
  }

  async run(msg: ChatMessage, { command, value }: CommandArgs): Promise<void> {
    if (!command) {
      return this.soundsList(msg)
    }

    // TODO: Управление командой
    if (msg.author.isMods) {
      switch (command) {
        case 'cooldown':
          break
        case 'blacklist':
          break
        case 'volume':
          break
        default:
          msg.reply('Аргумент команды не найден')
      }
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
      const findSound = this.sounds.find(sound => {
        if (sound.alias === command) {
          return sound
        }
      })

      if (findSound) {
        const { blacklist, cooldown, volume } = this.db.get('options').value()

        if (this.checkBlacklist(msg, name, blacklist)) {
          return
        }

        if (this.checkCooldown(msg, name, cooldown)) {
          return
        }

        this.usedBy.push({
          name,
          timestamp: Math.floor(Date.now() / 1000)
        })

        this.playSound(findSound, volume)
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

  playSound(sound: Sound, volume: number): number {
    const folder = path.join(__dirname, '../config/sounds')
    const file = path.join(folder, `${sound.file}`)

    if (this.isPlaying) {
      return this.soundQueue.push(sound)
    }

    try {
      this.isPlaying = true

      play(file, volume).then(() => {
        this.isPlaying = false

        if (this.soundQueue.length) {
          this.playSound(this.soundQueue.shift(), volume)
        }

        this.client.logger.info(sound.file, this.constructor.name)
      })
    } catch (err) {
      this.client.logger.error(err, this.constructor.name)
    }
  }
}