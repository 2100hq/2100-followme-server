const assert = require('assert')
const lodash = require('lodash')
const bn = require('bignumber.js')
const { hideMessage, shortId, getLinkMetadata, showMessage } = require('../utils')
const Promise = require('bluebird')
const highland = require('highland')


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
        //this gets followers but ignores tokenid and user.id
        const followers = await query.tokenHolders(tokenid,[tokenid,user.id])

        return Object.entries(followers).filter(([userid,amount])=>{
          if (parseInt(userid) === 0) return false // zero address
          if (userid.toLowerCase() === user.id.toLowerCase()) return false // exclude the owner from the list of followers
          return bn(amount).isGreaterThanOrEqualTo(threshold)
        }).reduce((obj, [userid,amount])=>{
          obj[userid] = amount
          return obj
        }, {})

      },

      async sendMessage({tokenid,message,hint=null,threshold=defaultThreshold,type=null,parentid=null}){
        let parentmessage

        // `parentid` signfiies this is a reply
        if (!parentid){
          assert(await query.isOwner(user.id,tokenid),'You are not the token owner')
          assert(bn(threshold).gt(0), 'You must set a threshold greater than zero')
        } else {
          parentmessage = await actions.getMessage(parentid)
          console.log('retrieved parentmessage', parentmessage)
          tokenid = parentmessage.tokenid
          threshold = parentmessage.threshold
          assert(!parentmessage.hidden, 'You need to decode the original message first before commenting')
          assert(!parentmessage.parentid, 'You cannot reply to a reply')
          hint = null // makes sure there's no hint for replies
        }

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
          parentid,
          linkMetadata
        })

        if (parentid){
          // only recipient is the parent message
          recipientIds.unshift(parentid)
        } else {
          //add owner to recipients
          recipientIds.unshift(user.id)
          //add token feed to recipients
          recipientIds.unshift(tokenid)
          //add anonymized public feed to recipients
          recipientIds.unshift(publicFeedId)
        }
        setImmediate(async () => {
          await Promise.all(recipientIds.map(threadid=>{
              return threads.create({threadid,messageid:message.id})
            })
          )
          if (!parentid) return
          // add this child message to the set of replies
          parentmessage = await messages.get(parentid)
          parentmessage.childCount = (parentmessage.childCount || 0)+1
          await messages.set(parentmessage)
        })


        return showMessage(message)
      },
      // async getMyInbox(start=0,end=Date.now()){
      //   return threads.betweenStream(user.id,start,end)
      //     .map(async thread=>{
      //       try {
      //         const message = await messages.get(thread.messageid)
      //         return showMessage(message)
      //       } catch(e){
      //         console.log('getMyInboxError',thread.messageid,e.message)
      //       }
      //     })
      //     .flatMap(highland)
      //     .compact()
      //     .collect()
      //     .toPromise(Promise)
      // },
      async getMyInbox(start=0,end=Date.now()){
        const list = await threads.byThread(user.id,start,end)
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
      // async getMyInbox(start=0,end=Date.now()){
      //   const list = await threads.between(user.id,start,end)
      //   return Promise.map(list,async thread=>{
      //       try {
      //         return showMessage(await messages.get(thread.messageid))
      //       } catch(e){
      //         console.log(thread.messageid)
      //       }
      //   })
      // },
      async getMessage(messageid){
        return query.getMessage(messageid,user.id)
      },
      async getTokenFeed(tokenid,start,end){
        const myHolding = await query.userHolding(user.id,tokenid)
        const ownerAddress = await query.getTokenOwner(tokenid)
        const list = await threads.byThread(tokenid,start,end)
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
      },
      async unreadNotifications(){
        return libs.notifications.userRead(user.id)
      },
      async setNotificationRead(notificationid){
        return libs.notifications.read(notificationid)
      },
    }
    return actions
  }
}
