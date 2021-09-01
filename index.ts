import path from 'path'
import { TwurpleClient } from './src/TwurpleClient'

const client = new TwurpleClient({
  pathConfig: path.join(__dirname, 'config.json'),
  channels: ['vs_code', 'le_xot']
})

client.registerDefaultCommands()

client.connect()