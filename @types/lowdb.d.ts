import type { ObjectChain } from 'lodash'

// https://github.com/typicode/lowdb/issues/485#issuecomment-870201372
declare module 'lowdb/lib/types/LowSync' {
  interface LowSync<T> {
    chain: ObjectChain<T>
  }
}