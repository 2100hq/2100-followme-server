const uuid = require('uuid/v4')
module.exports = (config,libs,emit=x=>x)=>{
  return (socket)=>{
    return {
      async authenticate(tokenid){
        const userid = await libs.authenticate(tokenid)
        socket.userid = userid
        //join socket channel
        await new Promise((res,rej)=>socket.join(userid,err=>{
          if(err) return rej(err)
          res()
        }))
        const state = await libs.query.privateState(userid)
        socket.emit('private',[[[],state]])
        return userid
      }
    }
  }
}
