const assert = require('assert')
const lodash = require('lodash')
const bn = require('bignumber.js')
const { hideMessage, shortId, getLinkMetadata, showMessage } = require('../utils')


module.exports = (config,{x2100,users,messages,threads,query})=>{
  assert(x2100,'requires 2100 client')
  assert(messages,'requires messages')
  assert(threads,'requires threads')
  assert(query,'requires query')
  const {publicFeedId, shortIdLength} = config
  assert(publicFeedId,'requires public feed id')
  return user=>{
    assert(user,'you must login')
    const defaultThreshold = user.defaultThreshold || config.defaultThreshold || "1"
    const actions = {
      me(){
        return user
      },
      myTokens(){
        return query.ownedTokens(user.id)
        // return x2100.public.call('ownedTokens',user.id)
      },
      setDefaultThreshold(threshold){
        return users.setDefaultThreshold(user.id,threshold)
      },
      async followers(tokenid,threshold=defaultThreshold){
        assert(await query.isOwner(user.id,tokenid),'You are not the token owner')
        const followers = await query.tokenHolders(tokenid)
        // assert(await x2100.public.call('isOwner',user.id,tokenid),'You are not the token owner')
        // const followers = await x2100.public.call('tokenHolders',tokenid)

        return Object.entries(followers).filter(([userid,amount])=>{
          if (parseInt(userid) === 0) return false // zero address
          if (userid.toLowerCase() === user.id.toLowerCase()) return false // exclude the owner from the list of followers
          return bn(amount).isGreaterThanOrEqualTo(threshold)
        }).reduce((obj, [userid,amount])=>{
          obj[userid] = amount
          return obj
        }, {})

      },
      async sendMessage(tokenid,message,hint,threshold=defaultThreshold,type=null){
        assert(await query.isOwner(user.id,tokenid),'You are not the token owner')
        // assert(await x2100.public.call('isOwner',user.id,tokenid),'You are not the token owner')
        assert(bn(threshold).gt(0), 'You must set a threshold greater than zero')

        // get follower ids; this excludes the owner
        // const recipientIds = [] Object.keys(await actions.followers(tokenid, threshold))

        const recipientIds = [] // don't deliver to any followers

        const linkMetadata = await getLinkMetadata(message)

        message = await messages.create({
          message,
          userid:user.id,
          tokenid,
          threshold,
          hint,
          shortid: shortId(shortIdLength),
          recipients: [...recipientIds],
          recipientcount: recipientIds.length,
          type,
          linkMetadata
        })

        //add owner to recipients
        recipientIds.unshift(user.id)
        //add token feed to recipients
        recipientIds.unshift(tokenid)
        //add anonymized public feed to recipients

        recipientIds.unshift(publicFeedId)

        setImmediate(async () => {
          await Promise.all(recipientIds.map(threadid=>{
              return threads.create({threadid,messageid:message.id})
            })
          )
          console.log('delivered all',message.id)
        })


        return showMessage(message)
      },
      async getMyInbox(start=0,end=Date.now()){
        const list = await threads.between(user.id,start,end)
        const inbox = await Promise.all(list.map(thread=>{
            try {
              return messages.get(thread.messageid)
            } catch(e){
              console.log(thread.messageid)
            }

          })
        )
        return inbox.map(showMessage)
      },
      async getMessage(messageid){
        const message = await messages.get(messageid)
        let myHolding = "0"
        try {
          // myHolding = await x2100.public.call('userHolding',user.id,message.tokenid)
          myHolding = await query.userHolding(user.id,message.tokenid)
        } catch(e){
          console.log('2100 error', e)
        }

        if(bn(myHolding).isGreaterThanOrEqualTo(message.threshold)) {

          // in the background, publish this message to user's inbox so they dont have to decode again
          threads.getByThreadIdMessageId(user.id, message.id).then( async result => {
            if (result.length > 0) return
            await threads.create({created: message.created, threadid: user.id,messageid:message.id})
            message.recipientcount = message.recipientcount+1
            message.recipients.push(user.id)
            await messages.set(message)
          })

          return showMessage(message)
        }

        return hideMessage(message)
      },
      async getTokenFeed(tokenid,start,end){
        const myHolding = await query.userHolding(user.id,tokenid)
        const ownerAddress = await query.getTokenOwner(tokenid)
        const list = await threads.between(tokenid,start,end)
        const isOwner = ownerAddress.toLowerCase() === user.id.toLowerCase()
        return Promise.all(list.map(async thread=>{
            const message = await messages.get(thread.messageid)
            if (isOwner) return showMessage(message)
            if(bn(myHolding).isGreaterThanOrEqualTo(message.threshold)) return showMessage(message)
            return hideMessage(message)
          })
        )
      },
      async destroy(messageid){
        const message = await messages.get(messageid)
        assert(message.userid.toLowerCase() === user.id.toLowerCase(), 'You do not have permission to destroy this message')
        await Promise.all([messages.destroy(messageid), threads.destroyByMessageid(messageid)])
      }
    }
    return actions
  }
}
