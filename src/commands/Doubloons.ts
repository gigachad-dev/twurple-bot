import { declOfNum } from '../utils'
import { TwurpleClient, BaseCommand, ChatMessage } from '../index'

export default class Doubloons extends BaseCommand {
  constructor(client: TwurpleClient) {
    super(client, {
      name: 'doubloons',
      userlevel: 'everyone',
      description: 'Получай дублоны без смс и регистрации KomodoHype',
      aliases: [
        'дублоны'
      ]
    })
  }

  async run(msg: ChatMessage) {
    const num = Math.round(Math.random() * 10000)
    msg.reply(`Получил ${num} ${declOfNum(num, ['дублон', 'дублона', 'дублонов'])} lexot1K`)
  }
}