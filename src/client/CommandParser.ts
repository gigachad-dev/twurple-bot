export interface CommandArguments {
  command: string
  prefix: string
  args: string[]
}

export class CommandParser {
  public static parse(message: string, prefix: string): CommandArguments | null {
    const regex = new RegExp('^(' + this.escapePrefix(prefix) + ')([^\\s]+) ?(.*)', 'gims')
    const matches = regex.exec(message)

    if (matches) {
      const prefix = matches[1]
      const command = matches[2]
      const result = {
        command: command,
        prefix: prefix,
        args: [] as string[]
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

  private static escapePrefix(prefix: string): string {
    if (
      prefix === '?' ||
      prefix === '^' ||
      prefix === '[' ||
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
