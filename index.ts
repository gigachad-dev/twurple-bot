import path from 'path'
import { TwurpleClient, ChatMessage } from './src'

import dotenv from 'dotenv'
dotenv.config()

const client = new TwurpleClient({
  pathConfig: path.join(__dirname, 'config.json'),
  channels: ['quakerlegend', 'vs_code'],
  botOwners: ['vs_code']
})

client.on('message', (msg: ChatMessage) => {
  if (msg.text.startsWith(client.options.prefix)) {
    return client.execCommand('sounds', msg)
  }

  if (!msg.author.isTrusted) {
    client.execCommand('automod', msg)
  }

  client.execCommand('hsdeck', msg)
})

client.registerDefaultCommands()

client.connect()