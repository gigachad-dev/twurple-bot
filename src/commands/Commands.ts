import { BaseCommand } from '../client'
import type { ChatMessage, TwurpleClient } from '../client'

export default class Commands extends BaseCommand {
  constructor(client: TwurpleClient) {
    super(client, {
      name: 'commands',
      userlevel: 'everyone',
      hideFromHelp: true,
      aliases: ['команды', 'help'],
      args: [
        {
          type: String,
          name: 'command'
        }
      ]
    })
  }

  async run(msg: ChatMessage, { command }: { command: string }): Promise<void> {
    if (command?.length) {
      Commands.commandHelp(msg, this.client.commands, command)
    } else {
      this.commandList(msg)
    }
  }

  async commandList(msg: ChatMessage): Promise<void> {
    const commands = this.client.commands
      .map((command) => {
        if (!command.options.hideFromHelp) {
          return this.client.config.prefix + command.options.name
        }
      })
      .filter((command) => command !== undefined)
      .join(', ')

    msg.reply(`Команды: ${commands}`)
  }

  static commandHelp(
    msg: ChatMessage,
    commands: BaseCommand[],
    name: string
  ): void {
    const selectedCommand = commands.find(({ options }) => {
      return options.name === name && !options.hideFromHelp
    })

    if (selectedCommand) {
      let messageText = selectedCommand.options.description

      if (selectedCommand.options.examples?.length) {
        messageText +=
          ', Использование: !' + selectedCommand.options.examples.join(', !')
      }

      if (messageText) {
        msg.reply(messageText)
      } else {
        msg.reply('Информация о команде отсутствует')
      }
    } else {
      msg.reply('Команда не найдена')
    }
  }
}
