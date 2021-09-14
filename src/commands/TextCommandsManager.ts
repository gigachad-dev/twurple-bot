import path from 'path'
import { LowSync } from 'lowdb'
import { ChatMessage, BaseCommand, CommandOptions, MessageType, TwurpleClient, UserLevel, TextCommand } from '../index'

type ITextCommand = Pick<CommandOptions, 'name' | 'message' | 'sendType' | 'hideFromHelp' | 'userlevel'>

export default class TextCommandsManager extends BaseCommand {
  private commands: LowSync<ITextCommand[]>

  constructor(client: TwurpleClient) {
    super(client, {
      name: 'command',
      userlevel: 'regular',
      hideFromHelp: true
    })

    this.commands = this.client.lowdbAdapter<ITextCommand[]>({
      path: path.join(__dirname, '../../config/commands.json'),
      initialData: [
        {
          name: 'ping',
          message: 'pong!',
          sendType: 'reply',
          userlevel: 'regular',
          hideFromHelp: true
        }
      ]
    })

    this.commands.data.forEach(command => {
      this.client.commands.push(new TextCommand(this.client, command))
      this.client.logger.info(`Register command ${command.name}`)
    })
  }

  async prepareRun(msg: ChatMessage, args: string[]) {
    if (args.length > 1) {
      const action = args[0]
      args.shift()
      const command = args[0]
      args.shift()
      const options = args.join(' ')

      switch (action) {
        case 'add':
          this.addCommand(msg, command, options)
          break

        case 'remove':
          this.removeCommand(msg, command)
          break

        case 'name':
          this.updateName(msg, command, options)
          break

        case 'get':
          this.getCommand(msg, command)
          break

        case 'userlevel':
          this.updateUserLevel(msg, command, options as UserLevel)
          break

        case 'sendtype':
          this.updateSendType(msg, command, options as MessageType)
          break

        default:
          msg.reply(`Action argument ${action} not found`)
      }
    }
  }

  addCommand(msg: ChatMessage, name: string, message: string): Promise<[string, string] | [string]> {
    if (!message.length) {
      return msg.reply('Message argument required')
    }

    const command = this.findCommand(name)

    if (!command) {
      const newCommand: ITextCommand = {
        name,
        message,
        sendType: 'reply',
        userlevel: 'everyone',
        hideFromHelp: true
      }

      this.client.commands.push(new TextCommand(this.client, newCommand))
      this.commands.data.push(newCommand)
      this.commands.write()

      msg.reply(`Command successfully created: ${this.client.config.prefix}${name} — ${message}`)
    } else {
      msg.reply('Command already exists')
    }
  }

  removeCommand(msg: ChatMessage, name: string): void {
    const command = this.commands.data.find(cmd => cmd.name === name)

    if (command) {
      this.client.commands = this.client.commands.filter(cmd => name !== cmd.options.name)
      this.commands.data = this.commands.data.filter(cmd => name !== cmd.name)
      this.commands.write()

      msg.reply(`Command ${command.name} successfully removed`)
    } else {
      msg.reply(`Command ${name} is not found`)
    }
  }

  getCommand(msg: ChatMessage, name: string): void {
    const command = this.findCommand(name)

    if (command) {
      msg.reply(`message: ${command.options.message}, userlevel: ${command.options.userlevel}, sendType: ${command.options.sendType}`)
    } else {
      msg.reply(`Command ${name} is not found`)
    }
  }

  updateUserLevel(msg: ChatMessage, name: string, userlevel: UserLevel): void {
    const UserLevels = Object.values(UserLevel)

    if (UserLevels.includes(userlevel)) {
      this.updateCommandOptions(msg, name, { userlevel })
    } else {
      msg.reply(`Available userlevels: ${UserLevels.join(', ')}`)
    }
  }

  updateSendType(msg: ChatMessage, name: string, sendType: MessageType): void {
    const SendTypes = Object.values(MessageType)

    if (SendTypes.includes(sendType)) {
      this.updateCommandOptions(msg, name, { sendType })
    } else {
      msg.reply(`Available send types: ${SendTypes.join(', ')}`)
    }
  }

  updateCommandOptions(msg: ChatMessage, name: string, { ...options }: Partial<ITextCommand>): void {
    const command = this.commands.data.find(command => command.name === name)
    Object.assign(command, options)
    this.commands.write()

    this.client.commands.forEach(command => {
      if (command.options.name === name) {
        command.options = {
          ...command.options,
          ...options
        }
      }
    })

    msg.reply('VoteYea')
  }

  updateName(msg: ChatMessage, command: string, name: string): void {
    if (name.length) {
      this.updateCommandOptions(msg, command, { name })
    } else {
      msg.reply('Message text required')
    }
  }

  updateMessage(msg: ChatMessage, command: string, message: string): void {
    if (message.length) {
      this.updateCommandOptions(msg, command, { message })
    } else {
      msg.reply('Message text required')
    }
  }

  findCommand(command: string): BaseCommand | undefined {
    return this.client.findCommand({ command })
  }
}