import got from 'got'
import _ from 'lodash'
import { VM } from 'vm2'
import { inspect } from 'util'

export const vm = async (code: string) => {
  try {
    const isPromise = code.indexOf('await') !== -1
    const nodeVM = new VM({
      sandbox: { _, got },
      timeout: 5000,
      fixAsync: true
    })

    let evaled = await nodeVM.run(isPromise ?
      `(async function(){${code}})()` :
      code
    )

    if (typeof evaled !== 'string') {
      evaled = inspect(evaled, { depth: 0 }).toString()
    }

    if (evaled.length > 500) {
      console.log(evaled)
      return 'Error: Exceeded character limit (500)'
    }

    return evaled
  } catch (err) {
    return err.toString()
  }
}