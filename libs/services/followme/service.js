const InitRethink = require('../../models/init-rethink')
const {RethinkConnection} = require('../../utils')
const Express = require('../../express')
const Events = require('events')
const Actions = require('../../actions')
const x2100 = require('../../2100')

module.exports = async (config)=>{
  config.publicFeedId = config.publicFeedId || '0x0'
  config.defaultThreshold = config.defaultThreshold || 0

  const con = await RethinkConnection(config.rethink)
  const events = new Events()
  const libs = await InitRethink(config,{con},(...args)=>events.emit('models',args))


  libs.x2100 ={
    public:await x2100(config[2100].host,'public'),
    // private:x2100(config[2100].host,'private'),
    // auth:x2100(config[2100].host,'auth'),
  }

  // libs.joins = await Joins(config,libs)
  // libs.query = await Queries(config,libs)
  libs.actions = {
    public:Actions('public',config,libs),
    private:Actions('private',config,libs),
    auth:Actions('auth',config,libs),
  }


  libs.authenticate = async function(userid){
    return userid.toLowerCase()
  }


  libs.express = await Express(config.express,libs)
}
