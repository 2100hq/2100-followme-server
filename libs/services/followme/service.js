const InitRethink = require('../../models/init-rethink')
const {RethinkConnection} = require('../../utils')
const Express = require('../../express')
const Events = require('events')
const Actions = require('../../actions')
const x2100 = require('../../2100')

module.exports = async (config)=>{
  config.publicFeedId = config.publicFeedId || '0x0'
  config.defaultThreshold = config.defaultThreshold || "1"

  const con = await RethinkConnection(config.rethink)
  const events = new Events()
  const libs = await InitRethink(config,{con},(...args)=>events.emit('models',args))


  const x2100Api = await x2100(config[2100].host)
  libs.x2100 ={
    public:x2100Api('public'),
    auth:  x2100Api('auth'),
    // private:x2100(config[2100].host,'private'),
  }

  // libs.joins = await Joins(config,libs)
  // libs.query = await Queries(config,libs)
  libs.actions = {
    public:Actions('public',config,libs),
    private:Actions('private',config,libs),
    auth:Actions('auth',config,libs),
  }

  libs.authenticate = async function(tokenid){
    console.log('tokenid',tokenid)
    if(config.disableAuth){
      //this should be userid if auth is disabled
      return tokenid.toLowerCase()
    }else{
      //this returns 2100 userid
      return libs.x2100.auth.call('user',tokenid)
    }
  }


  libs.express = await Express(config.express,libs)
}
