import { AccessToken, RefreshConfig, RefreshingAuthProvider } from '@twurple/auth'
import { ChatClient } from '@twurple/chat'
import { promises as fs } from 'fs'

type TwurpleConfig = AccessToken & Omit<RefreshConfig, 'onRefresh'>

(async () => {
  const config: TwurpleConfig = JSON.parse(await fs.readFile('./config.json', { encoding: 'utf-8' }))
  const authProvider = new RefreshingAuthProvider(
    {
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      onRefresh: async (tokens) => await refreshConfig(tokens)
    },
    config
  )

  const refreshConfig = async (tokens: AccessToken) => {
    const newTokens = {
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      tokens
    }

    await fs.writeFile(
      './tokens.json',
      JSON.stringify(newTokens, null, 2),
      { encoding: 'utf-8' }
    )
  }

  const chat = new ChatClient({ authProvider, channels: ['le_xot'] })
  await chat.connect()

  chat.onMessage((channel, user, message) => {
    if (message === '!dice') {
      const diceRoll = Math.floor(Math.random() * 6) + 1
      chat.say(channel, `@${user} rolled a ${diceRoll}`)
    }
  })
})()