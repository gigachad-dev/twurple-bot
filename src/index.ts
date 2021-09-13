import path from 'path'
import { ChatMessage } from './client/ChatMessage'
import { TwurpleClient } from './client/TwurpleClient'

import dotenv from 'dotenv'
dotenv.config()

const client = new TwurpleClient({
  config: path.join(path.resolve(), '../config/config.json'),
  commands: path.join(path.resolve(), './commands')
})

// client.on('message', (msg: ChatMessage) => {
//   if (msg.text.startsWith(client.config.data.prefix)) {
//     return client.execCommand('sounds', msg)
//   }

//   if (!msg.author.isMods) {
//     client.execCommand('automod', msg)
//   }

//   client.execCommand('hsdeck', msg)
// })

client.connect()