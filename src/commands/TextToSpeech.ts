import { exec } from 'child_process'
import { TwurpleClient, BaseCommand, ChatMessage } from '../client'

export default class TextToSpeech extends BaseCommand {
  private speed: number
  private volume: number
  private voice: string

  constructor(client: TwurpleClient) {
    super(client, {
      name: 'tts',
      userlevel: 'vip',
      description: 'Text to speech'
    })

    this.speed = 5
    this.volume = 35
    this.voice = 'Microsoft Irina Desktop'
  }

  async prepareRun(msg: ChatMessage, args: string[]): Promise<void> {
    if (args.length) {
      let cmd = 'powershell.exe Add-Type -AssemblyName System.speech; $speak = New-Object System.Speech.Synthesis.SpeechSynthesizer;'
      cmd += `$speak.SelectVoice('${this.voice}');`
      cmd += `$speak.Volume = ${this.volume};`
      cmd += `$speak.Rate = ${this.speed};`
      cmd += `$speak.Speak('${args.join(' ')}');`
      exec(cmd)
    } else {
      msg.reply(`${this.options.description}, Speed: ${this.speed}, Volume: ${this.volume}, Voice: ${this.voice}`)
    }
  }
}