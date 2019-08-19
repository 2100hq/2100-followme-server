const io = require('socket.io-client')

module.exports = async host => {
  console.log('connecting to 2100',host)
  const socket = io(host)
  await new Promise((res,rej)=>{
    socket.once('connect',res)
    socket.once('error',rej)
  })                            

  return (channel='private')=>{
    function call (action,...args){
      // console.log('calling 2100',action,...args)
      return new Promise((res,rej)=>{
        socket.emit(channel,action,args,(err,result)=>{
          // console.log(err,result)
          if(err) return rej(err)
          res(result)
        })
      })
    }
    function listen(cb){
      socket.on(channel,cb)
    }

    return {
      call,
      listen,
    }
  }
}
