import { TwurpleClient, BaseCommand, ChatMessage } from '../client'

export default class Part extends BaseCommand {
  constructor(client: TwurpleClient) {
    super(client, {
      name: 'part',
      userlevel: 'regular',
      botChannelOnly: true,
      args: [
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

  async run(msg: ChatMessage, { channel }: { channel: string }): Promise<[string, string] | [string]> {
    if (!channel) {
      return msg.reply('Укажите ник канала')
    }

    const findedChannel = this.client.config.channels.find(v => {
      return channel === v.replace('#', '')
    })

    if (findedChannel && findedChannel !== this.client.getUsername()) {
      this.client.tmi.part(channel).then(() => {
        this.client.updateConfig({
          channels: this.client.config.channels.filter(v => {
            return channel !== v
          })
        })

        msg.reply(`Бот на канале ${channel} успешно отключен`)
      }).catch(() => {
        msg.reply('Ошибка отключения')
      })
    } else {
      msg.reply(`Канал ${channel} не найден. Подключенные каналы: ${this.client.config.channels.join(', ')}`)
    }
  }
}