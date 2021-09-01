import path from 'path'
import { TwurpleClient } from '../src'

const client = new TwurpleClient({
  pathConfig: path.join(__dirname, 'config.json'),
  channels: ['quakerlegend', 'vs_code', 'le_xot']
})

client.registerDefaultCommands()

client.connect()