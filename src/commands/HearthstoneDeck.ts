import got from 'got'
import { decode } from 'deckstrings'
import { TwurpleClient, BaseCommand, ChatMessage } from '../index'

interface HsHeroes {
  id: number[]
  name: string
  class: string
}

interface HsFormats {
  id: number
  name: string
}

interface CardsInfo {
  cardClass: string
  set: string
  dbfId: number
}

interface ShortURLResponse {
  shortURL: string
}

export default class HearthstoneDeck extends BaseCommand {
  private heroes: HsHeroes[]
  private formats: HsFormats[]

  constructor(client: TwurpleClient) {
    super(client, {
      name: 'hsdeck',
      userlevel: 'everyone',
      description: 'Decode Hearthstone deckstrings',
      hideFromHelp: true
    })

    this.heroes = [
      {
        id: [],
        name: 'Охотника на демонов',
        class: 'DEMONHUNTER'
      },
      {
        id: [],
        name: 'Воина',
        class: 'WARRIOR'
      },
      {
        id: [],
        name: 'Чернокнижника',
        class: 'WARLOCK'
      },
      {
        id: [],
        name: 'Шамана',
        class: 'SHAMAN'
      },
      {
        id: [],
        name: 'Жреца',
        class: 'PRIEST'
      },
      {
        id: [],
        name: 'Паладина',
        class: 'PALADIN'
      },
      {
        id: [],
        name: 'Мага',
        class: 'MAGE'
      },
      {
        id: [],
        name: 'Охотника',
        class: 'HUNTER'
      },
      {
        id: [],
        name: 'Разбойника',
        class: 'ROGUE'
      },
      {
        id: [],
        name: 'Друида',
        class: 'DRUID'
      }
    ]

    this.formats = [
      {
        id: 1,
        name: 'Вольного'
      },
      {
        id: 2,
        name: 'Стандартного'
      },
      {
        id: 3,
        name: 'Классического'
      }
    ]

    this.loadCards()
  }

  async run(msg: ChatMessage): Promise<void> {
    msg.reply(this.options.description)
  }

  async loadCards(): Promise<void> {
    const { body } = await got<CardsInfo[]>(
      'https://api.hearthstonejson.com/v1/latest/enUS/cards.collectible.json',
      { responseType: 'json' }
    )

    this.heroes.forEach((hero, index) => {
      body.forEach((v: CardsInfo) => {
        if (hero.class === v.cardClass && v.set === 'HERO_SKINS') {
          this.heroes[index].id.push(v.dbfId)
        }
      })
    })
  }

  async execute(msg: ChatMessage): Promise<void> {
    const text = msg.text
    const isDeck = (str: string) => str.indexOf('AAE') > -1

    if (isDeck(text) && text.length > 16) {
      try {
        const deckString = text.split(' ').find(v => isDeck(v))
        const deck = decode(deckString)
        const hero = this.heroes.find((v: { id: number[] }) => v.id.includes(deck.heroes[0]))
        const format = this.formats.find((v: { id: number }) => deck.format === v.id)

        const { body } = await got.post<ShortURLResponse>(
          'https://hsdeckviewer.com/.netlify/functions/shorturl',
          {
            responseType: 'json',
            json: {
              longUrl: 'https://hsdeckviewer.com/?deckstring=' + encodeURIComponent(deckString)
            }
          }
        )

        const url = body.shortURL.replace('http', 'https')
        const message = `скинул колоду ${hero.name} для ${format.name} формата: ${url} HSCheers`

        if (msg.author.isBroadcaster) {
          msg.say(`${msg.channel.name} ${message}`)
        } else {
          msg.say(`@${msg.channel.name}, ${msg.author.displayName} ${message}`)
        }
      } catch (_) {
        msg.reply('Invalid deckstring HSWP')
      }
    }
  }
}