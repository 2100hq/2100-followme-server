require('dotenv').config()
const config = require('../libs/parseEnv')(process.env)
const Client = require('2100-server/libs/socket/client')
const test = require('tape')
const host = `http://localhost:${config.socket.port}`

test('socket',t=>{
  let actions 
  const state = {}
  t.test('init',async t=>{
    actions = await Client({
      host,channels:['auth','private','public']
    },state,console.log)
    t.ok(actions)
    t.end()
  })
  t.test('feed',async t=>{
    const result = await actions.public.call('feed')
    console.log(result)
    t.end()
  })
  t.test('authenticate',async t=>{
    const result = await actions.auth.call('authenticate',config.test.publicAddress).catch(t.end)
    console.log(result)
    t.end()
  })
  t.test('state',async t=>{
    console.log(state.private.messages)
    t.end()
  })
  t.test('me',async t=>{
    const result = await actions.private.call('me')
    console.log(result)
    t.end()
  })
})



