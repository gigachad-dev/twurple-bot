import { Router } from 'express'
import { TwitchControllers } from '../controllers/twitch.controller'
import type { TwurpleClient } from '../../client/TwurpleClient'
import type { Express } from 'express'

export default function twitch(client: TwurpleClient, app: Express) {
  const router = Router()
  app.use('/twitch', router)

  const controllers = new TwitchControllers(client)
  router.get('/auth', controllers.auth)
  router.get('/callback', controllers.callback)
}
