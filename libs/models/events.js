module.exports = (config,libs,emit=x=>x)=>{

  function write([table,method,data]){
    switch(table){
      case 'notifications':
        return emit('private',['notifications',data.id],data,data.userid)
    }

  }

  return {
    write
  }
}
