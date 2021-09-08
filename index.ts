import { join } from 'path'
import { TwurpleClient, ChatMessage } from './src'

import dotenv from 'dotenv'
dotenv.config()

const client = new TwurpleClient({
  config: join(__dirname, 'config.json'),
  commands: join(__dirname, 'src/commands')
})

client.on('message', (msg: ChatMessage) => {
  if (msg.text.startsWith(client.config.prefix)) {
    return client.execCommand('sounds', msg)
  }

  if (!msg.author.isTrusted) {
    client.execCommand('automod', msg)
  }

  client.execCommand('hsdeck', msg)
})

client.connect()