import dotenv from 'dotenv'
import { join } from 'path'
import { TwurpleClient } from './client/TwurpleClient'

dotenv.config()

const client = new TwurpleClient({
  config: join(__dirname, '../config/config.json'),
  commands: join(__dirname, './commands')
})

client.on('message', (msg) => {
  if (msg.text.startsWith(client.config.prefix)) {
    client.execCommand('sounds', msg)
  }
})
