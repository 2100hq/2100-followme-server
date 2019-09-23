const lodash = require('lodash')
const Promise = require('bluebird')
const assert = require('assert')
const { hideMessage } = require('../utils')

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
    const earned = lodash.cloneDeep(lodash.get(state,`earned.latest.${tokenid}`,{}))
    ignore.forEach(id=>lodash.unset(earned,id.toLowerCase()))
    return earned
  }
  function userHolding(userid,tokenid){
    assert(userid,'requires userid')
    assert(tokenid,'requires tokenid')
    const state = libs.x2100State.stats
    const token = state.earned.latest[tokenid]
    if(!token) return '0'
    return token[userid] || '0'
  }

  async function getMessage(messageid, userid){
    const message = await messages.get(messageid)
    console.log();
    console.log('>GETMESSAGE', message);
    let isHidden = true

    if (userid){
      const isOwner = await isOwner(userid,message.tokenid)
      const isAuthor = userid === message.userid
      let myHolding = "0"
      try {
        if (!isOwner && !isAuthor){
          myHolding = await userHolding(userid,message.tokenid)
        }
      } catch(e){
        console.log('2100 error', e)
      }
      isHidden = !isOwner && !isAuthor && bn(myHolding).isLessThan(message.threshold)
    }
    const outputFn = isHidden ? hideMessage : showMessage

    if (!isHidden){
      // This is a visible reply; do not deliver to user's inbox
      if (!message.parentid){
        // in the background, publish this message to user's inbox so they dont have to decode again
        threads.getByThreadIdMessageId(userid, message.id).then( async result => {
          if (result.length > 0) return
          await threads.create({created: message.created, threadid: userid,messageid:message.id})
        })
      }

      message.recipients = message.recipients || []

      if (!message.recipients.includes(userid)){
        message.recipientcount = (message.recipientcount || 0)+1
        message.recipients.push(userid)
        messages.set(message) // updates in the background
      }
    }

    // if you can see this message, you can see its parent
    if (message.parentid){
      console.log('getting parent', message)
      try {
        message.parent = await getMessage(message.parentid, user)
      } catch(e){
        message.parent = null
      }
    } else {
      // if you can see this message, you can see its children
      const children = await Promise.all((await threads.byThread(message.id)).map( async thread => {
          try {
            return await messages.get(thread.messageid)
          } catch(e){
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
    getMessage
  }

  // async function getPublicFeed(){
  // }
  // async function getUserInbox(){
  // }
  // async function getTokenFeed(){
  // }
}
