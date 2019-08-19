const assert = require('assert')
const Promise = require('bluebird')
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
        return Promise.map(list,async thread=>{
          const message = await messages.get(thread.messageid)
          return {
            id:message.id,
            userid:message.userid,
            created:message.created,
            length:message.message.length,
            threshold:message.threshold,
            tokenid:message.tokenid,
            hidden:true,
          }
        })
      }
    }
  }
}
