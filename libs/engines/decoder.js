const bn = require('bignumber.js')
module.exports = (config,libs,emit)=>{

  async function createNotification(userid,message,type){
    const notificationid = [userid,message.id].join('!')
    const exists = await libs.notifications.has(notificationid)
    if(exists) return
    return libs.notifications.create({
      id:notificationid,
      userid,
      messageid: message.id,
      tokenid: message.tokenid,
      parentid: message.parentid || null,
      type
    })
  }

  async function tick(message){
    const tokenHolders = await libs.query.tokenHolders(message.tokenid,[message.userid,message.tokenid])
    return Promise.all(Object.entries(tokenHolders).map(([userid,amount])=>{
      if (message.userid === userid) return
      if ((message.recipients || []).includes(userid)) return
      if(bn(amount).isLessThan(message.threshold)) {
        if (!message.parentuserid) return // this isnt a reply
        if (message.parentuserid !== userid) return  // this is a reply, and the token owner doesnt have enough of their token to see the reply
      }
      const type = message.parentid ? 'reply' : 'decodable'
      return createNotification(userid,message, type)
    }))
  }

  return {
    tick
  }
}
