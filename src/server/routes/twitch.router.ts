import { Express, Router } from 'express'
import { TwurpleClient } from '../../client/TwurpleClient.js'
import { TwitchControllers } from '../controllers/twitch.controller.js'

export default function twitch(client: TwurpleClient, app: Express) {
  const router = Router()
  app.use('/twitch', router)

  const controllers = new TwitchControllers(client)
  router.get('/auth', controllers.auth)
  router.get('/callback', controllers.callback)
}