import path from 'path'
import http from 'http'
import WebSocket from 'ws'
import express from 'express'
import { LowSync } from 'lowdb'
import migration from '../migrations/prediction.json'
import { TwurpleClient, BaseCommand, ChatMessage } from '../index'

interface IPrediction {
  options: { enabled: boolean }
  winners: Record<string, number>
  losers: Record<string, number>
}

export default class Prediction extends BaseCommand {
  private db: LowSync<IPrediction>

  constructor(client: TwurpleClient) {
    super(client, {
      name: 'prediction',
      userlevel: 'everyone',
      args: [
        {
          type: String,
          name: 'action'
        }
      ]
    })

    this.db = this.client.lowdbAdapter<IPrediction>({
      path: path.join(__dirname, '../../config/prediction.json'),
      initialData: migration
    })

    this.startWebSocketServer()
  }

  async run(msg: ChatMessage, { action }: { action: string }): Promise<void> {
    if (msg.author.isMods && action) { }
  }

  private startWebSocketServer() {
    const app = express()
    const server = http.createServer(app)
    const webSocketServer = new WebSocket.Server({ server })

    webSocketServer.on('connection', ws => {
      ws.on('message', message => {
        this.client.logger.info(`WS message: ${message}`)
        this.onMessage(message)
      })
      ws.on('close', code => this.client.logger.info(`WS closed: ${code}`))
      ws.on('error', err => this.client.logger.error(`WS error: ${err.message}`))
    })

    server.listen(7777, () => this.client.logger.info(`${this.constructor.name}: Websocket server started...`))
  }

  private onMessage(message: WebSocket.Data) {
    switch (message) {
      case 'start':
        this.startPrediction()
        break
      case 'win':
        this.winPrediction()
        break
      case 'lose':
        this.losePrediction()
        break
      case 'tied':
        this.cancelPrediction()
        break
    }
  }

  private startPrediction() { }

  private winPrediction() { }

  private losePrediction() { }

  private cancelPrediction() { }
}