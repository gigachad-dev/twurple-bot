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
  constructor(client: TwurpleClient) {
    super(client, {
      name: 'spotify',
      userlevel: 'everyone',
      aliases: [
        'музыка'
      ]
    })
  }

  async run(msg: ChatMessage) {
    try {
      const { body } = await got<SpotifyApiResponse>(
        'https://nowplaying-api.tinyrobot.co/playbackstate?key=' + process.env.SPOTIFY_NOW_PLAYING_KEY,
        { responseType: 'json' }
      )

      if (body.isPlaying) {
        msg.reply(`${body.artists[0].name} - ${body.songName}`)
      } else {
        msg.reply('Музыка не проигрывается')
      }
    } catch (err) {
      this.client.logger.error(err)
    }
  }
}