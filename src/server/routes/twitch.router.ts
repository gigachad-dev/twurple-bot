import { Express, Router } from 'express'
import { TwurpleClient } from '../../client/TwurpleClient'
import { TwitchControllers } from '../controllers/twitch.controller'

export class Twitch {
  constructor(client: TwurpleClient, app: Express) {
    const router = Router()
    app.use('/twitch', router)

    const controllers = new TwitchControllers(client)
    router.get('/auth', controllers.auth)
    router.get('/callback', controllers.callback)
  }
}