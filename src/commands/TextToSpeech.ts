//// sudo dnf install gtts sox
//// espeak-ng
//// https://github.com/rprtr258/tts
// https://github.com/emcifuntik/silero-tts
import path from 'path'
import { exec } from 'child_process'
import { BaseCommand } from '../client'
import type { LowSync } from 'lowdb-hybrid'
import type { ChildProcess } from 'child_process'
import type { TwurpleClient, ChatMessage } from '../client'

interface ITextToSpeech {
  tempo: number
  volume: number
}

export default class TextToSpeech extends BaseCommand {
  private playing = false
  private queue: string[][] = []
  private soundQueue: ChildProcess[] = []
  private db: LowSync<ITextToSpeech>
  private voices = [
    'kseniya',
    'xenia',
    'aidar',
    'baya',
    'eugene',
    'random'
  ]

  constructor(client: TwurpleClient) {
    super(client, {
      name: 'tts',
      userlevel: 'vip',
      description: 'Text to speech',
      examples: [
        'tts tempo <temp>',
        'tts volume <volume>',
        'tts voices'
      ]
    })

    this.db = this.client.lowdbAdapter<ITextToSpeech>({
      path: path.join(__dirname, '../../config/tts.json')
    })
  }

  async prepareRun(msg: ChatMessage, args: string[]) {
    if (args.length && msg.author.isRegular) {
      switch (args[0]) {
        case 'skip': {
          if (!this.soundQueue.length) return
          const proc = this.soundQueue.shift()
          proc.kill()
          break
        }
        case 'tempo':
          this.changeTemp(msg, args[1])
          break
        case 'volume':
          this.changeVolume(msg, args[1])
          break
        case 'help':
          msg.reply(`Доступные аргументы: ${this.options.examples.join(`, ${this.client.config.prefix}`)}`)
          break
        default:
          this.speech(args)
          break
      }
    } else if (args.length) {
      this.speech(args)
    } else {
      const { tempo, volume } = this.db.data
      msg.reply(`${this.options.description}, volume: ${volume}, speed: ${tempo}, voices: ${this.voices.join(', ')}`)
    }
  }

  changeTemp(msg: ChatMessage, tempo: string) {
    try {
      const v = Number(tempo)

      if (isNaN(v)) {
        throw false
      }

      this.db.data.tempo = v
      this.db.write()
    } catch (err) {
      msg.reply('Укажите тембр.')
    }
  }

  changeVolume(msg: ChatMessage, volume: string) {
    try {
      const vol = Number(volume)

      if (isNaN(vol)) {
        throw false
      }

      if (vol > 1 || vol < 0) {
        throw false
      }

      this.db.data.volume = vol
      this.db.write()
    } catch (err) {
      msg.reply('Укажите громкость звука от 0-1')
    }
  }

  speech(args: string[]) {
    const { message, voice } = (() => {
      let voice = this.voices[0]

      if (this.voices.includes(args[0])) {
        voice = args.shift()
      }

      const message = args
        .join(' ')
        // тут был rprtr258
        .replace(/[^а-яА-Я ]/g, '')

      return {
        message,
        voice
      }
    })()

    if (this.playing) {
      return this.queue.push(args)
    }

    this.playing = true
    const cmd = `docker run --rm -v /home/crashmax:/out tts ${voice} "${message}" tts.wav`

    exec(cmd, (err) => {
      if (err) {
        this.client.logger.error(
          err.toString(),
          this.constructor.name
        )
        this.playing = false
        return
      }

      this.playSound()
    })
  }

  private playSound(): void {
    const { tempo, volume } = this.db.data
    const cmd = `play -v ${volume} ~/tts.wav tempo ${tempo}`

    const nextSound = () => {
      this.playing = false

      if (this.queue.length) {
        this.speech(this.queue.shift())
      }

      this.soundQueue.shift()
    }

    const proc = exec(cmd, (err) => {
      if (err) {
        this.client.logger.error(err.message, this.constructor.name)
      }

      nextSound()
    })

    proc.on('close', () => {
      nextSound()
    })

    this.soundQueue.push(proc)
  }
}
