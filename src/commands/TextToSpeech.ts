import path from 'path'
import { LowSync } from 'lowdb-hybrid'
import { exec, spawn } from 'child_process'
import { TwurpleClient, BaseCommand, ChatMessage } from '../client'

interface ITextToSpeech {
  speed: number
  volume: number
  voice: string
}

export default class TextToSpeech extends BaseCommand {
  private playing = false
  private cmd: string
  private queue: string[] = []
  private db: LowSync<ITextToSpeech>

  constructor(client: TwurpleClient) {
    super(client, {
      name: 'tts',
      userlevel: 'vip',
      description: 'Text to speech',
      examples: [
        'tts voices',
        'tts voice <voice>',
        'tts speed <speed>',
        'tts volume <volume>'
      ]
    })

    this.cmd = 'Add-Type -AssemblyName System.speech; $speak = New-Object System.Speech.Synthesis.SpeechSynthesizer;'

    this.db = this.client.lowdbAdapter<ITextToSpeech>({
      path: path.join(__dirname, '../../config/tts.json')
    })
  }

  async prepareRun(msg: ChatMessage, args: string[]) {
    if (args.length) {
      this.parseArguments(msg, args)
    } else {
      const { speed, volume, voice } = this.db.data
      msg.reply(`${this.options.description}, speed: ${speed}, volume: ${volume}, voice: ${voice}`)
    }
  }

  parseArguments(msg: ChatMessage, args: string[]) {
    if (msg.author.isRegular) {
      switch (args[0]) {
        case 'voices':
          this.getVoices(response => msg.reply(response))
          break
        case 'voice':
          args.shift()
          this.changeVoice(msg, args.join(' '))
          break
        case 'speed':
          this.changeSpeed(msg, args[1])
          break
        case 'volume':
          this.changeVolume(msg, args[1])
          break
        default:
          msg.reply(`Доступные аргументы: ${this.options.examples.join(`, ${this.client.config.prefix}`)}`)
          break
      }
    } else {
      this.speech(args)
    }
  }

  getVoices(callback: (response: string) => void) {
    let voices = ''
    let cmd = this.cmd
    cmd += '$speak.GetInstalledVoices() | % {$_.VoiceInfo.Name}'

    const shell = spawn('powershell', [cmd])
    shell.stdout.on('data', (data: Buffer) => {
      voices += data.toString().split('\r\n')
    })

    shell.addListener('exit', (code, signal) => {
      if (code === null || signal !== null) {
        return callback(`say.getInstalledVoices(): could not get installed voices, had an error [code: ${code}] [signal: ${signal}]`)
      }

      if (voices.length > 0) {
        voices = (voices[voices.length - 1] === '') ? voices.slice(0, voices.length - 1) : voices
      }

      voices = voices.slice(0, -1)
      callback(voices.replace(',', ', '))
    })

    shell.stdin.end()
  }

  changeVoice(msg: ChatMessage, voice: string | undefined) {
    if (voice) {
      this.db.data.voice = voice
      this.db.write()
    } else {
      this.getVoices(response => {
        msg.reply(response)
      })
    }
  }

  changeSpeed(msg: ChatMessage, speed: string) {
    try {
      const spd = Number(speed)

      if (isNaN(spd)) {
        throw false
      }

      this.db.data.speed = spd
      this.db.write()
    } catch (err) {
      msg.reply('Укажите тембр. (рекомендуемое значение: 25-50)')
    }
  }

  changeVolume(msg: ChatMessage, volume: string) {
    try {
      const vol = Number(volume)

      if (isNaN(vol)) {
        throw false
      }

      if (vol > 100 || vol < 0) {
        throw false
      }

      this.db.data.volume = vol
      this.db.write()
    } catch (err) {
      msg.reply('Укажите громкость звука от 0-100')
    }
  }

  speech(args: string | string[]) {
    const message = typeof args !== 'string' &&
      args.join(' ').replace(/[&'<>]/gi, '')

    if (this.playing) {
      return this.queue.push(message)
    }

    const { speed, volume, voice } = this.db.data
    let cmd = 'powershell.exe ' + this.cmd
    cmd += `$speak.SelectVoice('${voice}'); `
    cmd += `$speak.Volume = ${volume}; `
    cmd += `$speak.Rate = ${speed}; `
    cmd += `$speak.Speak('${message}'); `

    this.playing = true

    exec(cmd, (err) => {
      if (err) {
        this.client.logger.error(
          err.toString(),
          this.constructor.name
        )
      }

      this.playing = false

      if (this.queue.length) {
        this.speech(this.queue.shift())
      }
    })
  }
}