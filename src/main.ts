import { join } from 'path'
import { TwurpleClient } from './index'

const client = new TwurpleClient({
  config: join(__dirname, '../config/config.json'),
  commands: join(__dirname, './commands')
})

client.on('message', (msg) => {
  client.execCommand('deck', msg)
})