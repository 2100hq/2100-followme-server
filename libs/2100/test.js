const Client = require('.')
const test = require('tape')

test('2100 client',t=>{
  let client
  t.test('init',t=>{
    client = Client('ws://localhost:9314','public') 
    t.ok(client)
    t.end()
  })
  t.test('call',async t=>{
    const result = await client.call('echo','test')
    console.log(result)
    t.equal(result,'test')
    t.end()
  })
})


