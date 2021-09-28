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
    prediction: HelixCreatePredictionData
  }
  // TODO: Prediction statistics
  winners: Record<string, number>
  losers: Record<string, number>
}

export default class Prediction extends BaseCommand {
  private db: LowSync<IPrediction>
  private currentPrediction: HelixPrediction | null
  private channel_id: string

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
    this.startWebSocketServer()
  }

  async run(msg: ChatMessage, { action }: { action: string }): Promise<void> {
    // TODO: Prediction everyone commands
    if (msg.channel.id === this.channel_id && msg.author.isMods && action) {
      this.onAction(action)
    }
  }

  private startWebSocketServer() {
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

  private async onAction(message: WebSocket.Data) {
    if (!this.currentPrediction) {
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
        this.resolvePrediction(this.currentPrediction.outcomes[0].id)
        break
      case 'lose':
        this.resolvePrediction(this.currentPrediction.outcomes[1].id)
        break
      case 'cancel':
        this.cancelPrediction()
        break
    }
  }

  private async getPrediction() {
    const prediction = await this.client.api.helix.predictions.getPredictions(
      this.channel_id
    )

    if (prediction.data) {
      this.currentPrediction = prediction.data[0]
    }
  }

  private async lockPrediction() {
    try {
      await this.client.api.helix.predictions.lockPrediction(
        this.channel_id,
        this.currentPrediction.id
      )
    } catch (err) {
      this.client.logger.error(err.message)
    }
  }

  private async startPrediction() {
    try {
      this.currentPrediction = await this.client.api.helix.predictions.createPrediction(
        this.channel_id,
        this.db.data.options.prediction
      )
    } catch (err) {
      this.client.logger.error(err.message)
    }
  }

  private async resolvePrediction(outcomeId: string) {
    try {
      await this.client.api.helix.predictions.resolvePrediction(
        this.channel_id,
        this.currentPrediction.id,
        outcomeId
      )
    } catch (err) {
      this.client.logger.error(err.message)
    }
  }

  private async cancelPrediction() {
    try {
      await this.client.api.helix.predictions.cancelPrediction(
        this.channel_id,
        this.currentPrediction.id
      )
    } catch (err) {
      this.client.logger.error(err.message)
    }
  }
}