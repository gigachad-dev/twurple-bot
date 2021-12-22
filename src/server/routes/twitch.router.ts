import type { Express } from 'express'
import { Router } from 'express'
import type { TwurpleClient } from '../../client/TwurpleClient'
import { TwitchControllers } from '../controllers/twitch.controller'

export default function twitch(client: TwurpleClient, app: Express) {
  const router = Router()
  app.use('/twitch', router)

  const controllers = new TwitchControllers(client)
  router.get('/auth', controllers.auth)
  router.get('/callback', controllers.callback)
}
