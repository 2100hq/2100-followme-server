const assert = require('assert')
const Promise = require('bluebird')
const { hideMessage } = require('../utils')
module.exports = (config,{threads,messages}) => {
  const {publicFeedId} = config
  assert(threads,'requires threads')
  assert(messages,'requires messages')
  assert(publicFeedId,'requires public feed id')
  return () => {
    return {
      echo(...args){
        return args
      },
      async feed(start,end){
        const list = await threads.between(publicFeedId,start,end)
        const ms = await messages.getAll(list.map(x=>x.messageid))

        return ms.map(hideMessage)
      }
    }
  }
}
