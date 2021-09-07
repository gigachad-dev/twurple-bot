import winston from 'winston'

export class ClientLogger {
  private log: winston.Logger

  constructor() {
    const formatter = winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY/MM/DD HH:mm:ss'
      }),
      winston.format.printf(info =>
        `[${info.timestamp}] (${info.service ?? '?'}) ${info.level.toUpperCase()}: ${info.message}`
      )
    )

    this.log = winston.createLogger({
      level: 'silly',
      format: winston.format.json(),
      transports: [
        new winston.transports.Console({
          level: 'verbose',
          format: formatter
        }),
        new winston.transports.File({
          filename: 'log_error.log',
          level: 'error',
          format: formatter
        }),
        new winston.transports.File({
          filename: 'log_info.log',
          level: 'info',
          format: formatter
        }),
        new winston.transports.File({
          filename: 'log_full.log',
          format: formatter
        })
      ]
    })
  }

  getLogger(moduleName?: string): winston.Logger {
    return this.log.child({ service: moduleName })
  }
}