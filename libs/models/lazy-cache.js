const highland = require('highland')
module.exports = (config, table, emit=x=>x) =>{
  
  const cache = new Map()
  

  return {
    ...table,
    async set(id,data){
      await table.set(id,data)
      return cache.set(id,data)
    },
    // readStream(){
    //   return highland(cache.values())
    // },
    async get(id){
      if(cache.has(id)){
        return cache.get(id)
      }
      const result = await table.get(id)
      if(result) cache.set(id,result)
      return result
    },
    async free(){
      cache.forEach((value,key,map)=>{
        if(value.done) map.delete(key)
      })
    }
  }
}

