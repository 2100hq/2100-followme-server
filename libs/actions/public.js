const assert = require('assert')
const highland = require('highland')
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
      async getTokenFeed(tokenid,start,end){
        const list = await threads.between(tokenid,start,end)
        return Promise.map(list,async thread=>{
          const message = await messages.get(thread.messageid)
          return hideMessage(message)
        })
      },
      async getMessage(messageid){
        console.log('public getMessage', messageid)
        const message = await messages.get(messageid)
        return hideMessage(message)
      },
      // async feed(start,end){
      //   return threads.betweenStream(publicFeedId,start,end)
      //     .map(async thread=>{
      //       const message = await messages.get(thread.messageid)
      //       return hideMessage(message)
      //     })
      //     .flatMap(highland)
      //     .collect()
      //     .toPromise(Promise)
      // }
      async feed(start,end){
        const list = await threads.between(publicFeedId,start,end)
        return Promise.map(list,async x=>{
          const message = await messages.get(x.messageid)
          return hideMessage(message)
        })
      }
    }
  }
}
