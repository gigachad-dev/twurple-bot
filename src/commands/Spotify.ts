import got from 'got'
import { TwurpleClient, BaseCommand, ChatMessage } from '../index'

export interface SpotifyApiResponse {
  isPlaying: boolean
  artists?: {
    name: string
    uri: string
  }[]
  albumName?: string
  albumUri?: string
  songName?: string
  songUri?: string
}

export default class Spotify extends BaseCommand {
  private key: string

  constructor(client: TwurpleClient) {
    super(client, {
      name: 'song',
      userlevel: 'everyone',
      description: 'Spotify now playing.'
    })

    this.key = process.env.SPOTIFY_NOW_PLAYING_KEY
  }

  async run(msg: ChatMessage): Promise<void> {
    if (!this.key) {
      return this.client.logger.error(
        'Please define the SPOTIFY_NOW_PLAYING_KEY environment variable inside .env',
        this.constructor.name
      )
    }

    try {
      const { body } = await got<SpotifyApiResponse>(
        'https://nowplaying-api.tinyrobot.co/playbackstate?key=' + this.key,
        { responseType: 'json' }
      )

      if (body.isPlaying) {
        msg.reply(`${body.artists[0].name} - ${body.songName}`)
      } else {
        msg.reply('Музыка не проигрывается')
      }
    } catch (err) {
      this.client.logger.error(err, this.constructor.name)
    }
  }
}