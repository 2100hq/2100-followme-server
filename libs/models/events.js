const { hideMessage } = require('../utils')

module.exports = (config,libs,emit=x=>x)=>{

  const {publicFeedId} = config

  async function write([table,method,data]){
    switch(table){
      case 'notifications':
        return emit('private',['notifications',data.id],data,data.userid)
      case 'threads':{
        if(data.threadid === publicFeedId){
          const message = await libs.messages.get(data.messageid)
          const hidden = hideMessage(message)
          emit('public',['feed',data.messageid],hidden)
        }
      }
    }
  }

  return {
    write
  }
}
