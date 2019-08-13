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
  let actions 
  const userid = publicAddress
  t.test('init',t=>{
    actions = {
      public:Actions(host)('public'),
      private:Actions(host)('private'),
    }
    actions.private.setToken(userid)
    t.end()
  })
  t.test('echo',async t=>{
    const result = await actions.public.call('echo','test').catch(t.end)
    t.end()
  })
  t.test('me',async t=>{
    const result = await actions.private.call('me').catch(t.end)
    console.log(result)
    t.end()
  })
  t.test('myTokens',async t=>{
    const result = await actions.private.call('myTokens')
    console.log('result',result)
    t.end()
  })
})


