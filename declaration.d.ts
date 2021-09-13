import { ObjectChain } from 'lodash'

declare namespace NodeJS {
  interface ProcessEnv {
    SPOTIFY_NOW_PLAYING_KEY: string
    WEATHER_KEY: string
    YOUTUBE_KEY: string
  }
}

// https://github.com/typicode/lowdb/issues/485#issuecomment-870201372
declare module 'lowdb/lib/types/LowSync' {
  interface LowSync<T> {
    chain: ObjectChain<T>
  }
}