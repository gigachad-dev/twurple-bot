// https://github.com/battlejj/recursive-readdir-sync
declare module 'recursive-readdir-sync' {
  function readdir(path: string): string[]
  export default readdir
}

declare namespace NodeJS {
  interface ProcessEnv {
    SPOTIFY_NOW_PLAYING_KEY: string
    WEATHER_KEY: string
    YOUTUBE_KEY: string
  }
}