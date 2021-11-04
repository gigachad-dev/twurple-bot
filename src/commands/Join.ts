import { TwurpleClient, BaseCommand, ChatMessage } from '../client'

export default class Join extends BaseCommand {
  constructor(client: TwurpleClient) {
    super(client, {
      name: 'join',
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
    
    const { channels } = this.client.db.data
    const findedChannel = channels.find(v => {
      return channel === v.replace('#', '')
    })

    if (!findedChannel && channel !== this.client.getUsername()) {
      this.client.tmi.join(channel).then(() => {
        this.client.updateConfig({
          channels: [
            ...channels,
            '#' + channel
          ]
        })

        msg.reply(`Бот на канале ${channel} успешно включен`)
      }).catch(() => {
        msg.reply('Ошибка подключения')
      })
    } else {
      msg.reply(`Канал ${channel} уже подключен`)
    }
  }
}