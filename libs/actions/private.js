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
    const defaultThreshold = user.defaultThreshold || config.defaultThreshold || 0
    return {
      me(){
        return user
      },
      myTokens(){
        return x2100.public.call('ownedTokens',user.id)
      },
      setDefaultThreshold(threshold){
        return users.setDefaultThreshold(user.id,threshold)
      },
      async followers(tokenid,threshold=defaultThreshold){
        threshold = ethToWei(threshold)
        assert(await x2100.public.call('isOwner',user.id,tokenid),'You are not the token owner')
        const followers = await x2100.public.call('tokenHolders',tokenid)
        return lodash(followers).entries().filter(([userid,amount])=>{
          return bn(amount).isGreaterThanOrEqualTo(threshold)
        }).map(([userid,amount])=>{
          return userid
        }).value()
      },
      async sendMessage(tokenid,message,threshold=defaultThreshold){
        assert(await x2100.public.call('isOwner',user.id,tokenid),'You are not the token owner')

        threshold = ethToWei(threshold)

        const followers = await x2100.public.call('tokenHolders',tokenid)

        message =  await messages.create({
          message,
          userid:user.id,
          tokenid:tokenid,
          threshold,
        })

        //add message to tokens feed
        await threads.create({threadid:tokenid,messageid:message.id})

        //add messages to followers inboxes
        const qualified = lodash(followers).entries().filter(([userid,amount])=>{
          return bn(amount).isGreaterThanOrEqualTo(threshold)
        }).map(([userid,amount])=>{
          return threads.create({threadid:userid,messageid:message.id})
        }).value()

        await Promise.all(qualified)

        return message
      },
      async getMyInbox(start=0,end=Date.now()){
        const list = await threads.between(user.id,start,end)
        return Promise.map(list,thread=>{
          return messages.get(thread.messageid)
        })
      },
      async getTokenFeed(tokenid,start,end){
        const myHolding = await x2100.public.call('userHolding',user.id,tokenid)
        const ownerAddress = await x2100.public.call('getTokenOwner',tokenid)
        const list = await threads.between(tokenid,start,end)

        return Promise.map(list,async thread=>{
          const message = await messages.get(thread.messageid)
          if(ownerAddress.toLowerCase() === user.id.toLowerCase())  return message
          if(bn(myHolding).isGreaterThanOrEqualTo(message.threshold)) return message
          return {
            id:message.id,
            userid:message.userid,
            created:message.created,
            length:message.length,
            threshold:message.threshold,
            tokenid:message.tokenid,
            hidden:true,
          }
        })
      }
    }
  }
}
