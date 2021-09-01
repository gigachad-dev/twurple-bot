import path from 'path'
import { TwurpleClient } from './src/TwurpleClient'

import dotenv from 'dotenv'
dotenv.config()

const client = new TwurpleClient({
  pathConfig: path.join(__dirname, 'config.json'),
  channels: ['archikoff', 'le_xot', 'vs_code'],
  botOwners: ['vs_code']
})

client.registerDefaultCommands()

client.connect()