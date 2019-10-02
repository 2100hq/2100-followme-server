require('dotenv').config()
const config = require('../libs/parseEnv')(process.env)
const Client = require('2100-server/libs/socket/client')
const test = require('tape')
const host = `http://localhost:${config.socket.port}`
const webpush = require('web-push')

test('push',t=>{
  const {email,publicKey,privateKey} = config.webpush
  let actions,subscriptions
  const state = {}
  t.test('init',async t=>{
    webpush.setVapidDetails(email,publicKey,privateKey)
    actions = await Client({
      host,channels:['auth','private','public']
    },state)
    t.end()
  })
  t.test('authenticate',async t=>{
    const result = await actions.auth.call('authenticate',config.test.publicAddress).catch(t.end)
    console.log(result)
    t.end()
  })
  t.test('subscriptions',async t=>{
    subscriptions = await actions.private.call('mySubscriptions')
    t.ok(subscriptions.length)
    console.log(subscriptions)
    t.end()
  })

  t.test('push',async t=>{
    const sub = subscriptions[1]
    const result = await webpush.sendNotification({
      endpoint:sub.endpoint,
      keys:sub.keys,
    },JSON.stringify({
      title:'tape test',
      body:'something',
      data:{
        url:'http://notifications.2100.daywiss.com/#clicked'
      }
    }))
    console.log(result)
    t.end()
  })
})

