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
      parentid: message.parentid,
      type
    })
  }

  async function tick(message){
    const tokenHolders = await libs.query.tokenHolders(message.tokenid,[message.userid,message.tokenid])
    return Promise.all(Object.entries(tokenHolders).map(([userid,amount])=>{
      if (message.userid === userid) return
      if ((message.recipients || []).includes(userid)) return
      if(bn(amount).isLessThan(message.threshold)) return
      const type = message.parentid ? 'reply' : 'decodable'
      return createNotification(userid,message, type)
    }))
  }

  return {
    tick
  }
}
