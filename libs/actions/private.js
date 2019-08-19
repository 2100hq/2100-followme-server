const assert = require('assert')
const lodash = require('lodash')
const Promise = require('bluebird')
const bn = require('bignumber.js')

module.exports = (config,{x2100,users,messages,threads})=>{
  assert(x2100,'requires 2100 client')
  assert(messages,'requires messages')
  assert(threads,'requires threads')
  const {publicFeedId} = config
  assert(publicFeedId,'requires public feed id')
  return user=>{
    assert(user,'you must login')
    const defaultThreshold = user.defaultThreshold || config.defaultThreshold || "1"
    const actions = {
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
        assert(await x2100.public.call('isOwner',user.id,tokenid),'You are not the token owner')
        const followers = await x2100.public.call('tokenHolders',tokenid)

        return Object.entries(followers).filter(([userid,amount])=>{
          if (userid.toLowerCase() === user.id.toLowerCase()) return false // exclude the owner from the list of followers
          return bn(amount).isGreaterThanOrEqualTo(threshold)
        }).reduce((obj, [userid,amount])=>{
          obj[userid] = amount
          return obj
        }, {})

      },
      async sendMessage(tokenid,message,threshold=defaultThreshold){
        assert(await x2100.public.call('isOwner',user.id,tokenid),'You are not the token owner')
        assert(bn(threshold).gt(0), 'You must set a threshold greater than zero')

        message = await messages.create({
          message,
          userid:user.id,
          tokenid:tokenid,
          threshold,
        })

        // get follower ids; this excludes the owner
        const recipientIds = Object.keys(await actions.followers(tokenid, threshold))

        //add owner to recipients
        recipientIds.unshift(user.id)
        //add token feed to recipients
        recipientIds.unshift(tokenid)
        //add anonymized public feed to recipients
        recipientIds.unshift(publicFeedId)

        //add messages to recipient inboxes
        const sent = recipientIds.map(threadid=>{
          return threads.create({threadid,messageid:message.id})
        })

        await Promise.all(sent)

        return message
      },
      async getMyInbox(start=0,end=Date.now()){
        const list = await threads.between(user.id,start,end)
        return Promise.map(list,thread=>{
          return messages.get(thread.messageid)
        })
      },
      async getMessage(messageid){
        const message = await messages.get(messageid)
        const myHolding = await x2100.public.call('userHolding',user.id,message.tokenid)
        if(bn(myHolding).isGreaterThanOrEqualTo(message.threshold)) return message
        return {
          id:message.id,
          userid:message.userid,
          created:message.created,
          length:message.message.length,
          threshold:message.threshold,
          tokenid:message.tokenid,
          hidden:true,
        }
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
            length:message.message.length,
            threshold:message.threshold,
            tokenid:message.tokenid,
            hidden:true,
          }
        })
      }
    }
    return actions
  }
}
