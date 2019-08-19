const assert = require('assert')
const lodash = require('lodash')
module.exports = (name, config, libs)=>{
  const actions = require('./' + name)(config,libs)
  assert(actions,'actions not found: ' + name)
  return async (user,action,args)=>{
    // console.log(user,action,...args)
    const id = lodash.uniqueId([name,action,''].join(' '))
    console.time(id)
    const scope = actions(user)
    assert(scope[action],'No such action ' + action + ' in ' + name)
    const result = await scope[action](...args)
    console.timeEnd(id)
    return result
  }
}

