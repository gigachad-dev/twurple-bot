import { TwurpleClient, BaseCommand, ChatMessage } from '../client'

export default class Ignore extends BaseCommand {
  private isFinded: string | undefined

  constructor(client: TwurpleClient) {
    super(client, {
      name: 'ignore',
      userlevel: 'regular',
      args: [
        {
          name: 'action',
          type: String
        },
        {
          name: 'channel',
          type: String,
          prepare: (channel: string) => {
            return channel.replace('@', '').toLowerCase()
          }
        }
      ]
    })
  }

  async run(msg: ChatMessage, { action, channel }: { action: string, channel: string }) {
    if (!action) {
      return msg.reply('Укажите действие')
    }

    if (!channel) {
      return msg.reply('Укажите ник пользователя')
    }

    this.isFinded = this.client.db.data.ignoreList.find(v => v === channel)

    switch (action) {
      case 'add':
        this.add(msg, channel)
        break
      case 'remove':
        this.remove(msg, channel)
        break
      default:
        msg.reply(`Действие ${action} не найдено!`)
        break
    }
  }

  private add(msg: ChatMessage, channel: string) {
    if (this.isFinded) {
      return msg.reply(`Пользователь ${channel} уже находится в черном списке cmonBruh`)
    }

    if (channel !== this.client.getUsername()) {
      this.client.updateConfig({
        ignoreList: [
          ...this.client.db.data.ignoreList,
          channel
        ]
      })

      msg.reply(`Пользователю ${channel} запрещено использовать команды`)
    } else {
      msg.reply('Нельзя заблокировать самого себя')
    }
  }

  private remove(msg: ChatMessage, channel: string) {
    if (this.isFinded) {
      this.client.updateConfig({
        ignoreList: this.client.db.data.ignoreList.filter(v => v !== channel)
      })

      msg.reply(`Пользователь ${channel} удален из черного списка SeemsGood`)
    } else {
      msg.reply(`Пользователь ${channel} не найден`)
    }
  }
}