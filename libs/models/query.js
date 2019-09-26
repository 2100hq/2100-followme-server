const lodash = require('lodash')
const Promise = require('bluebird')
const assert = require('assert')
const { hideMessage, showMessage } = require('../utils')
const bn = require('bignumber.js')

module.exports = async (config, libs) => {
  const {threads,messages} = libs
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

  async function messagesByHour(hour,threadid,userid){
    const thread = await threads.byHour(hour.toString(),threadid)
    return Promise.map(thread,thread=>{
      return getMessage(thread.messageid,userid)
    })
  }

  async function mixFeedByHour(hour,threadids=[],userid){
    const messages = await Promise.map(threadids,threadid=>{
      return messagesByHour(hour,threadid,userid)
    })


    const result =  messages.reduce((result,messages)=>{
      messages.forEach(message=>{
        if(result[message.id] == null) {
          result[message.id] = message
        }
      })
      return result
    },{})

    return Object.values(result)
  }

  async function getMessage(messageid, userid, gotMessages = []){
    gotMessages.push(messageid) // this prevents infinite recursion; ids retreived are pushed to this object

    const message = await messages.get(messageid)

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
        threads.getByThreadIdMessageId(userid, message.id).then( async result => {
          if (result.length > 0) return
          await threads.create({created: message.created, threadid: userid,messageid:message.id})
        })
      }

      message.recipients = message.recipients || []

      // If user previously hasnt 'received' it
      if (!message.recipients.includes(userid)){
        message.recipientcount = (message.recipientcount || 0)+1
        message.recipients.push(userid)
        messages.set(message) // updates in the background
      }
    }

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
    }

    return outputFn(message)
  }

  return {
    userHolding,
    tokenHolders,
    isOwner,
    ownedTokens,
    getTokenOwner,
    getMessage,
    messagesByHour,
    mixFeedByHour,
  }

  // async function getPublicFeed(){
  // }
  // async function getUserInbox(){
  // }
  // async function getTokenFeed(){
  // }
}
