import path from 'path'
import type { LowSync } from 'lowdb-hybrid'
import { randomInt } from '../utils'
import type { TwurpleClient, ChatMessage } from '../client'
import { BaseCommand } from '../client'

interface IPokemons {
  id: string
  name: string
}

export default class Pokemons extends BaseCommand {
  private pokemons: LowSync<IPokemons[]>

  constructor(client: TwurpleClient) {
    super(client, {
      name: 'pokemon',
      userlevel: 'everyone',
      description: 'А ты что за Покемон?',
      aliases: [
        'покемон'
      ],
      examples: [
        'pokemon',
        'pokemon <name>'
      ]
    })

    this.pokemons = this.client.lowdbAdapter<IPokemons[]>({
      path: path.join(__dirname, '../../config/pokemons.json')
    })
  }

  async prepareRun(msg: ChatMessage, args: string[]): Promise<void> {
    if (args.length > 0) {
      this.searchPokemon(msg, args)
    } else {
      this.randomPokemon(msg)
    }
  }

  searchPokemon(msg: ChatMessage, args: string[]): void {
    const query = args.join(' ').toLowerCase()
    const pokemon = this.findPokemon(query)

    if (pokemon) {
      msg.reply(`${pokemon.name}: modpixelmon.ru/${pokemon.id}`)
    } else {
      msg.reply(`Покемон "${query}" не найден`)
    }
  }

  randomPokemon(msg: ChatMessage): void {
    const pokemon = this.pokemons.data[randomInt(0, this.pokemons.data.length - 1)]
    msg.reply(`А ты что за покемон? Ты ${pokemon.name} KomodoHype modpixelmon.ru/${pokemon.id}`)
  }

  findPokemon(query: string): IPokemons {
    return this.pokemons.data.find(pokemon => {
      // на английском
      if (pokemon.id.indexOf(query) > -1) {
        return pokemon
      }

      // на русском
      if (pokemon.name.toLowerCase().indexOf(query) > -1) {
        return pokemon
      }
    })
  }
}
