import type { Response, Express } from 'express'
import { Router } from 'express'
import type { TwurpleClient } from '../../client/TwurpleClient'

async function checkUsernameRoute(
  data: any,
  response: Response,
  client: TwurpleClient
) {
  try {
    const { username } = data
    if (!username) {
      throw new Error('Username is required')
    }

    const user = await client.api.users.getUserByName(username)
    if (!user) {
      throw new Error('User not found')
    }

    response.status(200).json({ id: user.id, displayName: user.displayName })
  } catch (err) {
    response.status(400).json({ error: (err as Error).message })
  }
}

export default function user(client: TwurpleClient, app: Express) {
  const router = Router()
  app.use('/userscript', router)

  // compat
  app.post('/users', async (request, response) => {
    await checkUsernameRoute(request.body, response, client)
  })

  router.get('/check-user', async (request, response) => {
    await checkUsernameRoute(request.query, response, client)
  })

  router.get('/users', (request, response) => {
    response.status(200).json(client.userscriptDb.data.users)
  })

  router.post('/users', async (request, response) => {
    try {
      const { id, name, password } = request.body
      if (process.env.USERSCRIPT_PASSWORD !== password) {
        throw new Error('Дальше вы не пройдете пока не получите бумаги')
      }

      if (id === undefined) {
        throw new Error('id is required')
      }

      if (name === undefined) {
        throw new Error('name is required')
      }

      const userInfo = await client.api.users.getUserById(id)
      if (!userInfo) {
        throw new Error('user not found')
      }

      const users = client.userscriptDb.data.users.filter((user) => {
        return user.id !== id
      })

      if (name) {
        users.push({ id, name })
      }

      client.userscriptDb.data.users = users
      client.userscriptDb.write()

      response.json({ ok: true, id, name })
    } catch (err) {
      response.status(400).json({ error: (err as Error).message })
    }
  })
}
