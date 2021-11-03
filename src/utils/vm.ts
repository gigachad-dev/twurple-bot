import got from 'got'
import _ from 'lodash'
import safeEval from 'safe-eval'
import { inspect } from 'util'

export const vm = async (code: string) => {
  try {
    const isPromise = code.indexOf('await') !== -1
    const context = {
      _,
      got
    }

    let evaled = await safeEval(isPromise ? `(async function fn() { ${code} })()` : code, context)

    if (typeof evaled !== 'string') {
      evaled = inspect(evaled, { depth: 0 }).toString()
    }

    if (evaled.length > 500) {
      console.log(evaled)
      return 'Exceeded character limit (500)'
    }

    return evaled
  } catch (err) {
    return err.toString()
  }
}