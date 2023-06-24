import cors from 'cors'
import type { Express } from 'express'
import express from 'express'
import twitch from './routes/twitch.router'
import users from './routes/userscript.router'
import type { TwurpleClient } from '../client/TwurpleClient'

export class Server {
  public app: Express

  constructor(
    private client: TwurpleClient
  ) {
    this.app = express()

    this.app.disable('x-powered-by')
    this.app.use(cors())
    this.app.use(express.json())

    twitch(this.client, this.app)
    users(this.client, this.app)
  }
}
