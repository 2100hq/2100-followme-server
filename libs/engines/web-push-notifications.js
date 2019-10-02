// const bn = require('bignumber.js')
const webpush = require('web-push')
const assert = require('assert')
module.exports = (config,libs,emit)=>{
  assert(config.webpush,'requires webpush')

  const {email,publicKey,privateKey} = config.webpush

  assert(email,'requires webpush email')
  assert(publicKey,'requires webpush publicKey')
  assert(privateKey,'requires webpush privateKEy')

  webpush.setVapidDetails(email,publicKey,privateKey)

  const types= {
    reply(notification){
      return {
        title:'You have a new 2100 reply',
        messageid:notfication.messageid,
        type:notification.type,
      }
    },
    decodable(){
      return {
        title:'You can decode a 2100 message',
        messageid:notfication.messageid,
        type:notification.type,
      }
    }
  }


  async function tick(notification){
    const subs = await libs.subscriptions.getByUser(notification.userid)
    const payload = await types[notification.type]
    return Promise.all(subs.map(async sub =>{
      console.log('sending notfication',sub,payload)
      return webpush.sendNotification(sub,JSON.stringify(payload)).catch(err=>{
        //if theres an error remove the subscription
        console.log('error sending subscription, removing',err.message)
        return libs.subscriptions.remove(sub)
      })
    }))
  }

  return {
    tick
  }
}
