const Promise = require('bluebird')
const bn = require('bignumber.js')
module.exports = (config,libs,emit)=>{

  async function createNotification(userid,messageid,title,message){
    const notificationid = [userid,messageid].join('!')
    const exists = await libs.notifications.has(notificationid)
    if(exists) return
    return libs.notifications.create({
      id:notificationid,
      userid,
      messageid,
      title,
      message,
    })
  }

  async function tick(message){
    const tokenHolders = await libs.query.tokenHolders(message.tokenid,[message.id,message.tokenid])
    return Promise.map(Object.entries(tokenHolders),([userid,amount])=>{
      if(bn(amount).isLessThan(message.threshold)) return
      return createNotification(userid,message.id,'Message Available','You can decode a new message')
    })
  }

  return {
    tick
  }
}
