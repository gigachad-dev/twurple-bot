import path from 'path'
import { LowSync } from 'lowdb'
import { LogWatcher } from 'hearthstone-parser'
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

const ACTION_PREDICTION = [
  'lock',
  'start',
  'win',
  'lose',
  'cancel'
] as const

type ActionPrediction = typeof ACTION_PREDICTION[number]

export default class Prediction extends BaseCommand {
  private db: LowSync<IPrediction>
  private current_prediction: HelixPrediction | null
  private channel_id: string
  private hsWathcher: LogWatcher

  constructor(client: TwurpleClient) {
    super(client, {
      name: 'prediction',
      userlevel: 'regular',
      hideFromHelp: true,
      args: [
        {
          type: String,
          name: 'action',
          // prepare: (action: ActionPrediction) => {
          //   const isAction = ACTION_PREDICTION.includes(action)

          //   if (isAction) {
          //     return action
          //   } else {
          //     return false
          //   }
          // }
        }
      ]
    })

    this.db = this.client.lowdbAdapter<IPrediction>({
      path: path.join(__dirname, '../../config/prediction.json'),
      initialData: migration
    })

    this.channel_id = this.db.data.options.channel_id
    this.startHeartstoneWatcher()
  }

  async startHeartstoneWatcher() {
    this.hsWathcher = new LogWatcher()

    this.hsWathcher.on('game-start', () => {
      if (!this.current_prediction) return
      this.onAction('start')
    })

    this.hsWathcher.on('game-over', () => {
      if (!this.current_prediction) return

      const player = this.hsWathcher.gameState.getPlayerByPosition('bottom')
      switch (player.status) {
        case 'WON':
          return this.onAction('win')
        case 'LOST':
          return this.onAction('lose')
        case 'TIED':
          return this.cancelPrediction()
      }
    })

    this.hsWathcher.start()

    await this.client.api?.getTokenInfo()
    await this.setCurrentPrediction()
  }

  async run(msg: ChatMessage, { action }: { action: ActionPrediction }): Promise<void> {
    // TODO: Prediction everyone commands
    if (msg.channel.id === this.channel_id) {
      if (action) {
        this.onAction(action)
      } else {
        this.switchPrediction(msg)
      }
    }
  }

  async onAction(action: ActionPrediction): Promise<void> {
    try {
      if (!this.db.data.options.enabled) return

      switch (action) {
        case 'lock':
          return this.lockPrediction()
        case 'start':
          return this.startPrediction()
        case 'win':
          return this.resolvePrediction(this.current_prediction.outcomes[0].id)
        case 'lose':
          return this.resolvePrediction(this.current_prediction.outcomes[1].id)
        case 'cancel':
          return this.cancelPrediction()
      }
    } catch (_) { }
  }

  switchPrediction(msg: ChatMessage): void {
    this.db.data.options.enabled = !this.db.data.options.enabled
    this.db.write()
    msg.reply(`Prediction mode is ${this.db.data.options.enabled ? 'enabled' : 'disabled'}`)
  }

  async setCurrentPrediction(): Promise<void> {
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

  async cancelPrediction(): Promise<void> {
    await this.client.api.helix.predictions.cancelPrediction(
      this.channel_id,
      this.current_prediction.id
    )
  }
}