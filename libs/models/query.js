const lodash = require('lodash')
const moment = require('moment')
const Promise = require('bluebird')
const assert = require('assert')
const { hideMessage,showMessage } = require('../../utils')

module.exports = async (config, libs) => {

  const {threads,messages,users,x2100} = libs

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

  function getHiddenFeed(start,end){
    const list = await threads.between(publicFeedId,start,end)
    const ms = await messages.getAll(list.map(x=>x.messageid))
    return ms.map(hideMessage)
  }

  function tokenFollowers(tokenid,threshold){
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
    const list = await threads.between(user.id,start,end)

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

  async function privateState(userid){
  }
  async function publicState(){
    return {
      feed: lodash.keyBy(await publicFeed(moment().subtract(1,'day').toValue(),Date.now()),'id')
    }
  }

  return {
    userHolding,
    tokenHolders,
    isOwner,
    ownedTokens,
    getTokenOwner,
  }

  // async function getPublicFeed(){
  // }
  // async function getUserInbox(){
  // }
  // async function getTokenFeed(){
  // }
}
