import got from 'got'
import _ from 'lodash'
import { VM } from 'vm2'
import { inspect } from 'util'
import type { CommandVariables } from '../client'

export const vm = async (code: string, variables: CommandVariables) => {
  try {
    const nodeVM = new VM({
      timeout: 5000,
      sandbox: {
        _,
        got,
        random(min: number, max: number) {
          return variables.random(min, max)
        },
        async chatter() {
          return await variables.chatter()
        }
      }
    })

    const evaled = await evalTemplate(nodeVM, code)
    if (evaled.length > 500) {
      console.log(evaled)
      return 'Error: Exceeded character limit (500)'
    }

    return evaled
  } catch (err) {
    return err.toString()
  }
}

const evalTemplate = async (nodeVM: VM, code: string) => {
  const initialCode = code
  const isPromise = code.indexOf('await') !== -1
  const matches1 = [...code.matchAll(/\${"(.+)"}/g)]

  if (matches1.length) {
    for (const match of matches1) {
      const response = await nodeVM.run(`(async function(){${match[1]}})()`)
      code = code.replace(match[0], inspectCode(response))
    }
  }

  const matches2 = [...code.matchAll(/\${(.+)}/g)]
  if (code === initialCode || matches2.length) {
    code = await nodeVM.run(isPromise ?
      `(async function(){${code}})()` :
      code
    )
  }

  return inspectCode(code)
}

const inspectCode = (code: string | any) => {
  if (typeof code !== 'string') {
    return inspect(code, { depth: 0 }).toString()
  }

  return code
}
