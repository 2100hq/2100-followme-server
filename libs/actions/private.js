const assert = require('assert')
const lodash = require('lodash')
const Promise = require('bluebird')
const {ethToWei} = require('../utils')
const bn = require('bignumber.js')

module.exports = (config,{x2100,users,messages,threads})=>{
  assert(x2100,'requires 2100 client')
  assert(messages,'requires messages')
  assert(threads,'requires threads')
  return user=>{
    assert(user,'you must login')
    return {
      me(){
        return user
      },
      myTokens(){
        return x2100.public.call('ownedTokens',user.id)
      },
      async createMessage(tokenid,message,threshold=config.defaultThreshold){

        assert(await x2100.public.call('isOwner',user.id,tokenid),'You are not the token owner')

        threshold = ethToWei(threshold)

        const followers = await x2100.public.call('tokenHolders',tokenid)
        
        message =  await messages.create({
          message,
          userid:user.id,
          threshold,
        })

        //add message to users own inbox
        await threads.create({threadid:user.id,messageid:messageid})

        //add messages to followers inboxes
        const qualified = lodash(followers).filter((amount,userid)=>{
          return bn(amount).isGreaterThanOrEqualTo(threshold)
        }).map((amount,userid)=>{
          return threads.create({threadid:userid,messageid:message.id})
        })

        await Promise.all(qualified)

        return message
      },
      async getMyInbox(start=0,end=Date.now()){
        const list = threads.between(user.id,start,end)
        return Promise.map(list,thread=>{
          return messages.get(thread.messageid)
        })
      },
      async getUserFeed(tokenid,start,end){
        const myHolding = await x2100.public.call('userHolding',user.id,tokenid)
        const list = threads.between(tokenid,start,end)

        return Promise.reduce(list,async (result,thread)=>{
          const message = await messages.get(thread.messageid)
          if(bn(myHolding).isGreaterThanOrEqualTo(message.threshold)){
            result.push(message)
          }
          return result
        },[])
      }
    }
  }
}
