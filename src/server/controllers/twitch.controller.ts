import got from 'got'
import { AccessToken } from '@twurple/auth'
import { TwurpleClient } from '../../client/TwurpleClient'
import { Request, Response, NextFunction } from 'express'

export class TwitchControllers {
  private authRedirect: string
  private authUri: string

  constructor(
    private client: TwurpleClient
  ) {
    this.auth = this.auth.bind(this)
    this.callback = this.callback.bind(this)

    this.authRedirect = `http://${this.client.config.server.hostname}:${this.client.config.server.port}/twitch/callback`
    this.authUri = `https://id.twitch.tv/oauth2/authorize?client_id=${this.client.config.clientId}&redirect_uri=${this.authRedirect}&response_type=code&scope=${this.client.config.scope.join('+')}`
  }

  async auth(req: Request, res: Response, next: NextFunction) {
    res.writeHead(301, {
      Location: this.authUri
    }).end()
  }

  async callback(req: Request, res: Response, next: NextFunction) {
    if (this.client.commands.length) {
      return res.json({ message: 'Bot is running!' })
    }

    const code = req.query.code

    if (code && typeof code === 'string') {
      try {
        const data = await this.getAuthToken(code)
        this.client.updateTokens(data as AccessToken)
        await this.client.connect()
        res.json({ success: true, data })
      } catch (err) {
        res.json(err)
      }
    } else {
      res.json({ success: false })
    }
  }

  private async getAuthToken(code: string) {
    const response = await got<any>('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      responseType: 'json',
      searchParams: {
        client_id: this.client.config.clientId,
        client_secret: this.client.config.clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: this.authRedirect,
        code
      }
    })

    if (response.statusCode !== 200) {
      this.client.logger.error(`Bad response from twitch getting oauth token.\nStatus: ${response.statusCode}\nBody: ${JSON.stringify(response.body)}`)
      throw new Error(`Bad response from twitch getting oauth token.`)
    }

    const { scope, access_token, refresh_token, expires_in } = response.body

    return {
      scope,
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresIn: expires_in
    }
  }
}