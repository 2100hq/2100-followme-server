require('dotenv').config()
const axios = require('axios')
const test = require('tape')
const config = require('../libs/parseEnv')(process.env)
const host = `http://localhost:${config.express.port}`
const {publicAddress} = config.test

const Actions = host => (channel,method='post') => {
  let token
  const call = async (action,...args) => {
    const options = {
      method,
      url:`${host}/${channel}/${action}`,
      data:args,
      json:true,
    }
    if(token){
      options.headers = {}
      options.headers['Authorization'] = 'Bearer ' + token
    }
    return axios(options).then(result=>{
      return result.data
    }).catch(err=>{
      console.log(err.response.data)
      throw new Error(err.response.data)
    })
  }
  function setToken(t){
    token = t
  }

  return {
    call,
    setToken
  }
}


test('express',t=>{
  let actions, mytoken, messages
  const userid = publicAddress

  t.test('init',t=>{
    actions = {
      public:Actions(host)('public'),
      private:Actions(host)('private'),
    }
    // actions.private.setToken(config.test.tokenid)
    actions.private.setToken(config.test.publicAddress)
    t.end()
  })
  t.test('echo',async t=>{
    const result = await actions.public.call('echo','test').catch(t.end)
    t.end()
  })
  t.test('public.feed',async t=>{
    const result = await actions.public.call('feed').catch(t.end)
    console.log(result)
    t.end()
  })
  t.test('me',async t=>{
    const result = await actions.private.call('me').catch(t.end)
    console.log(result)
    t.end()
  })
  t.test('myTokens',async t=>{
    const result = await actions.private.call('myTokens')
    // console.log(result)
    t.ok(result.length)
    mytoken = result[0]
    t.end()
  })
  t.test('sendMessage',async t=>{
    const result = await actions.private.call('sendMessage',{tokenid:mytoken.id,message:'test',hint:'test'})
    console.log('result',result)
    t.end()
  })
  t.test('getMyInbox',async t=>{
    const result = await actions.private.call('getMyInbox')
    console.log('result',result)
    t.end()
  })
  t.test('getTokenFeed',async t=>{
    messages = await actions.private.call('getTokenFeed',mytoken.id)
    console.log('result',messages)
    t.end()
  })
  t.test('followers',async t=>{
    const result = await actions.private.call('followers',mytoken.id,'0')
    console.log('result',result)
    t.end()
  })
  t.test('setDefaultThreshold',async t=>{
    const result = await actions.private.call('setDefaultThreshold',"2")
    console.log('result',result)
    t.end()
  })
  t.test('getMessage',async t=>{
    const result = await actions.private.call('getMessage',messages[0].id)
    console.log('result',result)
    t.end()
  })
  t.test('publicByHour',async t=>{
    const time = '1566223200000'                                                                     
    const result = await actions.public.call('feedByHour',time)
    console.log('result',result)
    t.end()
  })
  t.test('inboxByHour',async t=>{
    const time = '1566223200000'                                                                     
    const result = await actions.private.call('inboxByHour',time)
    console.log('result',result)
    t.end()
  })
  t.test('feedByHour',async t=>{
    const time = '1566223200000'                                                                     
    const result = await actions.private.call('feedByHour',time)
    console.log('result',result)
    t.end()
  })


})


