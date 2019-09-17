const lodash = require('lodash')
const Promise = require('bluebird')
const assert = require('assert')

module.exports = async (config, libs) => {
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
    const state = libs.x2100State.public
    const earned = lodash.cloneDeep(lodash.get(state,`stats.earned.latest.${tokenid}`,{}))
    ignore.forEach(id=>lodash.unset(earned,id.toLowerCase()))
    return earned
  }
  function userHolding(userid,tokenid){
    assert(userid,'requires userid')
    assert(tokenid,'requires tokenid')
    const state = libs.x2100State.public
    const token = state.stats.earned.latest[tokenid]
    if(!token) return '0'
    return token[userid] || '0'
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
