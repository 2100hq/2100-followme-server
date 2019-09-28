const lodash = require('lodash')
const moment = require('moment')
const Promise = require('bluebird')
const assert = require('assert')
const { hideMessage,showMessage } = require('../utils')
const bn = require('bignumber.js')
module.exports = async (config, libs) => {
  const {threads,messages,users,x2100,notifications} = libs
  const {publicFeedId} = config

  function ownedTokens(userid){
    assert(userid,'requires userid')
    const state = libs.x2100State.public
    return Object.values(state.tokens.active || []).filter(x=>x.ownerAddress.toLowerCase() == userid.toLowerCase())
  }
  function isOwner(userid,tokenid){
    assert(userid,'requires userid')
    assert(tokenid,'requires tokenid')
    const state = libs.x2100State.public
    const token = state.tokens.active[tokenid]
    if(!token) return false
    return token.ownerAddress.toLowerCase() == userid.toLowerCase()
  }
  function getTokenOwner(tokenid){
    assert(tokenid,'requires tokenid')
    const state = libs.x2100State.public
    const token = state.tokens.active[tokenid]
    if(!token) return null
    return token.ownerAddress.toLowerCase()
  }
  function tokenHolders(tokenid,ignore=[]){
    assert(tokenid,'requires tokenid')
    const state = libs.x2100State.stats
    const earned = lodash.get(state,`earned.latest.${tokenid}`,{})
    const result =  Object.entries(earned).reduce((result,[key,value])=>{
      if(ignore.includes(key.toLowerCase())) return result
      result[key]=value
      return result
    },{})
    return result
  }
  function userHolding(userid,tokenid){
    assert(userid,'requires userid')
    assert(tokenid,'requires tokenid')
    const state = libs.x2100State.stats
    const token = state.earned.latest[tokenid]
    if(!token) return '0'
    return token[userid] || '0'
  }

  async function getHiddenFeed(start,end){
    const list = await threads.byThread(publicFeedId)
    return Promise.all(list.map(async thread=>{
      const message = await messages.get(thread.messageid)
      return hideMessage(message)
    }))
  }

  async function tokenFollowers(tokenid,threshold){
    const followers = await tokenHolders(tokenid,[tokenid,user.id])

    return Object.entries(followers).filter(([userid,amount])=>{
      if (parseInt(userid) === 0) return false // zero address
      if (userid.toLowerCase() === user.id.toLowerCase()) return false // exclude the owner from the list of followers
      return bn(amount).isGreaterThanOrEqualTo(threshold)
    }).reduce((obj, [userid,amount])=>{
      obj[userid] = amount
      return obj
    }, {})
  }

  async function userInbox(userid,start,end){
    const list = await threads.byThread(userid)

    return Promise.map(list,async thread=>{
      const message = await messages.get(thread.messageid)
      return showMessage(message)
    })
  }

  async function userTokenFeed(userid,tokenid,start,end){
    const myHolding = await userHolding(userid,tokenid)
    const ownerAddress = await getTokenOwner(tokenid)
    const list = await threads.between(tokenid,start,end)
    const isOwner = ownerAddress.toLowerCase() === userid.toLowerCase()

    return Promise.map(list,async thread=>{
      const message = await messages.get(thread.messageid)
      if (isOwner) return showMessage(message)
      if(bn(myHolding).isGreaterThanOrEqualTo(message.threshold)) return showMessage(message)
        return hideMessage(message)
    })
  }

  async function userNotifications(userid,read=false){
    return notifications.userRead(userid,read)
  }

  async function privateState(userid){
    return {
      notifications: lodash.keyBy(await userNotifications(userid),'id'),
      messages: lodash.keyBy(await userInbox(userid),'id')
    }
  }

  async function publicState(){
    return {
      messages: lodash.keyBy(await getHiddenFeed(),'id')
    }
  }

  async function getMessage(messageid, userid, gotMessages = []){
    gotMessages.push(messageid) // this prevents infinite recursion; ids retreived are pushed to this object

    let message = await messages.get(messageid)

    let isHidden = true
    let _isOwner = false
    let isAuthor = false
    let isReply = message.parentid != null

    // if user is logged in
    if (userid){
      _isOwner = await isOwner(userid,message.tokenid)
      isAuthor = userid === message.userid
      let myHolding = "0"
      try {
        if (!_isOwner && !isAuthor){
          myHolding = await userHolding(userid,message.tokenid)
        }
      } catch(e){
        console.log('2100 error', e)
      }
      isHidden = !_isOwner && !isAuthor && bn(myHolding).isLessThan(message.threshold)
    }

    const outputFn = isHidden ? hideMessage : showMessage

    // If this message is visible and author isn't retrieving the message
    if (!isHidden && !isAuthor){
      // If this is not a reply
      if (!isReply){
        // in the background, publish this message to user's inbox so they dont have to decode again
        await threads.getByThreadIdMessageId(userid, message.id).then( async result => {
          if (result.length > 0) return
          await threads.create({created: message.created, threadid: userid,messageid:message.id})
        })
      }

      message.recipients = message.recipients || []

      // If user previously hasnt 'received' it
      if (!message.recipients.includes(userid)){
        message.recipientcount = (message.recipientcount || 0)+1
        message.recipients.push(userid)
        await messages.set({...message}) // updates in the background; clone the object before saving, mutations below
      }
    }
    message = {...message} // clone the object, mutations below

    if (isReply){
      // if you can see this message, you can see its parent
      try {
        const id = message.parentid
        if (!gotMessages.includes(id)) message.parent = await getMessage(id, user, gotMessages)
      } catch(e){
        message.parent = null
      }
    }

    if (!isReply) {
      // if you can see this message, you can see its children
      const children = await Promise.all((await threads.byThread(message.id)).map(thread => {
          // might throw if message has been deleted
          try {
            const id = thread.messageid
            if (gotMessages.includes(id)) return null
            return getMessage(id, userid, gotMessages)
          } catch(e){
            console.log('getting child messages for', messageid)
            console.log(e)
            return null
          }
        })
      )

      message.children = children.filter(x=>x)

      const recipientTimestamps = await Promise.all((message.recipients||[]).map(async userid => {
          const result = await threads.getByThreadIdMessageId(userid, message.id)
          if (result.length === 0) return null
          const {id} = result[0]
          const [_, timestamp] = id.split('!') // hack to get the correct timestamp; create is the same for all threads for some reason
          return {userid, created: Number(timestamp)}
        })
      )

      message.recipientTimestamps = recipientTimestamps.map(x => x)
    }

    return outputFn(message)
  }

  return {
    userHolding,
    tokenHolders,
    isOwner,
    ownedTokens,
    getTokenOwner,
    publicState,
    privateState,
    getHiddenFeed,
    getMessage
  }

  // async function getPublicFeed(){
  // }
  // async function getUserInbox(){
  // }
  // async function getTokenFeed(){
  // }
}
