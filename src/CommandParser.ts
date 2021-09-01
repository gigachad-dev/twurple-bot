export interface CommandArguments {
  command: string
  prefix?: string
  args?: string[]
}

export type CommandParsed = Required<CommandArguments>

export class CommandParser {
  parse(message: string, prefix: string): CommandParsed | null {
    const regex = new RegExp('^(' + this.escapePrefix(prefix) + ')([^\\s]+) ?(.*)', 'gims')
    const matches = regex.exec(message)

    if (matches) {
      const prefix = matches[1]
      const command = matches[2]
      const result: CommandParsed = {
        command: command,
        prefix: prefix,
        args: []
      }

      if (matches.length > 3) {
        result.args =
          matches[3]
            .trim()
            .split(' ')
            .filter(v => v !== '')
      }

      return result
    }

    return null
  }

  private escapePrefix(prefix: string) {
    if (
      prefix === '?' ||
      prefix === '^' ||
      prefix === '[' ||
      prefix === ']' ||
      prefix === ']' ||
      prefix === '(' ||
      prefix === ')' ||
      prefix === '*' ||
      prefix === '\\'
    ) {
      prefix = '\\' + prefix
    }

    return prefix
  }
}