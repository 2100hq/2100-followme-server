const InitRethink = require('../../models/init-rethink')
const {RethinkConnection,loop} = require('../../utils')
const Express = require('../../express')
const Events = require('events')
const Actions = require('../../actions')
const ApiEvents = require('../../models/events')
const Query = require('../../models/query')
const x2100 = require('2100-server/libs/socket/client')
const highland = require('highland')
const Engines = require('../../engines')

module.exports = async (config)=>{
  config.publicFeedId = config.publicFeedId || '0x0'
  config.defaultThreshold = config.defaultThreshold || "1"
  config.shortIdLength = config.shortIdLength || 7

  const con = await RethinkConnection(config.rethink)
  const events = new Events()
  const libs = await InitRethink(config,{con},(...args)=>events.emit('models',args))


  libs.x2100State = {}
  libs.x2100 = await x2100({host:config[2100].host,channels:['auth','stats','public']},libs.x2100State)
  await libs.x2100.auth.call('joinStats')

  //wait for state to come in
  await libs.x2100.public.call('state')

  // libs.joins = await Joins(config,libs)
  libs.query = await Query(config,libs)
  libs.actions = {
    public:Actions('public',config,libs),
    private:Actions('private',config,libs),
    auth:Actions('auth',config,libs),
  }


  libs.authenticate = async function(tokenid){
    // console.log('tokenid',tokenid)
    if(config.disableAuth){
      //this should be userid if auth is disabled
      return tokenid.toLowerCase()
    }else{
      //this returns 2100 userid
      return libs.x2100.auth.call('user',tokenid)
    }
  }

  const apiEvents = ApiEvents(config,libs,(...args)=>events.emit('socket',args))

  events.on('models',args=>{
    apiEvents.write(args)
  })

  const engines = {
    decoder:Engines('decoder')(config,libs)
  }

  //calculate notifications
  loop(async x=>{
    return libs.messages
      .readStream()
      .map(engines.decoder.tick)
      .flatMap(highland)
      .last()
      .toPromise(Promise)
  },60000)

  // events.on('socket',([channel,path,data,userid])=>{
  //   socket[channel](path,data,userid)
  // })




  libs.express = await Express(config.express,libs)
}
