const { hideMessage } = require('../utils')

module.exports = (config,libs,emit=x=>x)=>{

  async function write([table,method,data]){
    switch(table){
      case 'notifications':
        return emit('private',['notifications',data.id],data,data.userid)
      case 'threads':{
        const message = await libs.messages.get(data.messageid)
        const hidden = hideMessage(message)
        emit('public',['feed',data.messageid],hidden)
      }
    }

  }

  return {
    write
  }
}
