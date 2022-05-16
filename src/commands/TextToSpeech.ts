/**
 * dnf install gtts-cli
 * dnf install sox
 */
import path from 'path'
import { exec } from 'child_process'
import { BaseCommand } from '../client'
import type { LowSync } from 'lowdb-hybrid'
import type { TwurpleClient, ChatMessage } from '../client'

interface ITextToSpeech {
  volume: number
}

export default class TextToSpeech extends BaseCommand {
  private playing = false
  private queue: string[] = []
  private db: LowSync<ITextToSpeech>

  constructor(client: TwurpleClient) {
    super(client, {
      name: 'tts',
      userlevel: 'vip',
      description: 'Text to speech',
      examples: [
        'tts volume <volume>'
      ]
    })

    this.db = this.client.lowdbAdapter<ITextToSpeech>({
      path: path.join(__dirname, '../../config/tts.json')
    })
  }

  async prepareRun(msg: ChatMessage, args: string[]) {
    if (args.length && msg.author.isRegular) {
      switch (args[0]) {
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
      msg.reply(`${this.options.description}, volume: ${this.db.data.volume}`)
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

  speech(args: string | string[]) {
    const message = typeof args !== 'string' ?
      args.join(' ').replace(/[&'<>]/gi, '') :
      args

    if (this.playing) {
      return this.queue.push(message)
    }

    this.playing = true
    const cmd = ['gtts-cli', `"${message}"`, '-l ru', '-o ~/tts.mp3']

    exec(cmd.join(' '), (err) => {
      if (err) {
        this.client.logger.error(
          err.toString(),
          this.constructor.name
        )
      }

      this.playSound()
    })
  }

  private playSound(): void {
    const cmd = ['play', `-v ${this.db.data.volume}`, '~/tts.mp3']

    exec(cmd.join(' '), (err) => {
      if (err) {
        this.client.logger.error(err.message, this.constructor.name)
      }

      this.playing = false
      if (this.queue.length) {
        this.speech(this.queue.shift())
      }
    })
  }
}
