import type { Express } from 'express'
import type { TwurpleClient } from '../../client/TwurpleClient'

export default function user(client: TwurpleClient, app: Express) {
  app.post('/users', async (request, response) => {
    const { username } = request.body
    if (!username) {
      response.status(400).json({ error: 'Username is required' })
      return
    }

    const user = await client.api.users.getUserByName(username)
    if (user) {
      response.status(200).json({ id: user.id, displayName: user.displayName })
    } else {
      response.status(404).json({ error: 'User not found' })
    }
  })
}
