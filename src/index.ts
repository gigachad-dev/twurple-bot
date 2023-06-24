import { join } from 'path'
import { TwurpleClient } from './client/TwurpleClient'

import dotenv from 'dotenv'
dotenv.config()

const client = new TwurpleClient({
  userscriptDbPath: join(__dirname, '../config/userscript.json'),
  config: join(__dirname, '../config/config.json'),
  commands: join(__dirname, './commands')
})

client.on('message', (msg) => {
  if (!msg.author.isMods) {
    client.execCommand('automod', msg)
  }
})
