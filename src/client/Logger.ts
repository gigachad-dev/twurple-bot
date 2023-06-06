import winston, { createLogger } from 'winston'

export class Logger {
  private static formatter = winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY/MM/DD HH:mm:ss'
    }),
    winston.format.printf(
      (info) =>
        `[${info.timestamp}]${
          info.module ? ` (${info.module}) ` : ' '
        }${info.level.toUpperCase()}: ${info.message}`
    )
  )

  private static logger: winston.Logger = createLogger({
    level: 'silly',
    format: winston.format.json(),
    transports: [
      new winston.transports.Console({
        level: 'verbose',
        format: this.formatter
      }),
      new winston.transports.File({
        filename: 'log_error.log',
        level: 'error',
        format: this.formatter
      }),
      new winston.transports.File({
        filename: 'log_info.log',
        level: 'info',
        format: this.formatter
      }),
      new winston.transports.File({
        filename: 'log_full.log',
        format: this.formatter
      })

    ]
  })

  public static info(message: string, module?: string): void {
    this.logger.info(message, { module })
  }

  public static warn(message: string, module?: string): void {
    this.logger.warn(message, { module })
  }

  public static error(message: string, module?: string): void {
    this.logger.error(message, { module })
  }
}
