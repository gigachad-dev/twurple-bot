import path from 'path'
import http from 'http'
import WebSocket from 'ws'
import express from 'express'
import { LowSync } from 'lowdb'
import migration from '../migrations/prediction.json'
import { HelixPrediction, HelixCreatePredictionData } from '@twurple/api/lib'
import { TwurpleClient, BaseCommand, ChatMessage } from '../index'

interface IPrediction {
  options: {
    enabled: boolean
    channel_id: string
    channel_name: string
    prediction: HelixCreatePredictionData
  }
  // TODO: Prediction statistics
  winners: Record<string, number>
  losers: Record<string, number>
}

export default class Prediction extends BaseCommand {
  private db: LowSync<IPrediction>
  private current_prediction: HelixPrediction | null
  private channel_id: string
  private channel_name: string

  constructor(client: TwurpleClient) {
    super(client, {
      name: 'prediction',
      userlevel: 'everyone',
      hideFromHelp: true,
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

    this.channel_id = this.db.data.options.channel_id
    this.channel_name = this.db.data.options.channel_name
    this.startWebSocketServer()
  }

  async run(msg: ChatMessage, { action }: { action: string }): Promise<void> {
    // TODO: Prediction everyone commands
    if (msg.channel.id === this.channel_id && msg.author.isMods) {
      if (action) {
        this.onAction(action)
      } else {
        this.switchPrediction(msg)
      }
    }
  }

  startWebSocketServer(): void {
    const app = express()
    const server = http.createServer(app)
    const webSocketServer = new WebSocket.Server({ server })

    webSocketServer.on('connection', ws => {
      ws.on('message', message => {
        this.client.logger.info(`WS message: ${message}`)
        this.onAction(message)
      })
      ws.on('close', code => this.client.logger.info(`WS closed: ${code}`))
      ws.on('error', err => this.client.logger.error(`WS error: ${err.message}`))
    })

    server.listen(7777, () => this.client.logger.info(`${this.constructor.name}: Websocket server started...`))
  }

  async onAction(message: WebSocket.Data): Promise<[string]> {
    try {
      if (!this.db.data.options.enabled) {
        return this.client.say(this.channel_name, `Please turn on the prediction mode!`)
      }

      if (!this.current_prediction) {
        await this.getPrediction()
      }

      switch (message) {
        case 'lock':
          this.lockPrediction()
          break
        case 'start':
          this.startPrediction()
          break
        case 'win':
          this.resolvePrediction(this.current_prediction.outcomes[0].id)
          break
        case 'lose':
          this.resolvePrediction(this.current_prediction.outcomes[1].id)
          break
        case 'cancel':
          this.cancelPrediction()
          break
      }
    } catch (_) { }
  }

  switchPrediction(msg: ChatMessage): void {
    this.db.data.options.enabled = !this.db.data.options.enabled
    this.db.write()
    msg.reply(`Prediction mode is ${this.db.data.options.enabled ? 'enabled' : 'disabled'}`)
  }

  async getPrediction(): Promise<void> {
    const prediction = await this.client.api.helix.predictions.getPredictions(
      this.channel_id
    )

    if (prediction.data) {
      this.current_prediction = prediction.data[0]
    }
  }

  async lockPrediction(): Promise<void> {
    await this.client.api.helix.predictions.lockPrediction(
      this.channel_id,
      this.current_prediction.id
    )
  }

  async startPrediction(): Promise<void> {
    this.current_prediction = await this.client.api.helix.predictions.createPrediction(
      this.channel_id,
      this.db.data.options.prediction
    )
  }

  async resolvePrediction(outcomeId: string): Promise<void> {
    await this.client.api.helix.predictions.resolvePrediction(
      this.channel_id,
      this.current_prediction.id,
      outcomeId
    )
  }

  private async cancelPrediction(): Promise<void> {
    await this.client.api.helix.predictions.cancelPrediction(
      this.channel_id,
      this.current_prediction.id
    )
  }
}