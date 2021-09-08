import { TwurpleClient, BaseCommand, ChatMessage } from '../index'

export default class Commands extends BaseCommand {
  constructor(client: TwurpleClient) {
    super(client, {
      name: 'commands',
      userlevel: 'everyone',
      description: `This command shows help for all commands. Send ${client.config.prefix}help <command> for detailed help on a command.`,
      aliases: [
        'команды',
        'help'
      ],
      examples: [
        `${client.config.prefix} commands`,
        `${client.config.prefix} help <command>`
      ],
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
      this.commandHelp(msg, command)
    } else {
      this.commandList(msg)
    }
  }

  async commandList(msg: ChatMessage): Promise<void> {
    const commands: string[] = []

    for (const cmd of this.client.commands) {
      if (!cmd.options.hideFromHelp) {
        commands.push(this.client.config.prefix + cmd.options.name)
      }
    }

    msg.reply(`Команды: ${commands.join(', ')}`)
  }

  commandHelp(msg: ChatMessage, command: string): void {
    const selectedCommand = this.client.commands.find(({ options }) => {
      return options.name === command && !options.hideFromHelp
    })

    if (selectedCommand) {
      let messageText = selectedCommand.options.description

      if (selectedCommand.options.examples?.length) {
        messageText += ', Использование: ' + selectedCommand.options.examples.join(', ')
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