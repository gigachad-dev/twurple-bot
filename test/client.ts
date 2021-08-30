import path from 'path'
import { TwurpleBot } from '../src'

const bot = new TwurpleBot({
  config: path.join(__dirname, 'config.json'),
  channels: ['vs_code', 'le_xot']
})

bot.connect()