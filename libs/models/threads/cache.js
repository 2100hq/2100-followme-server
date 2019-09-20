module.exports = (config, table, emit=x=>x) =>{
  const cache = new Map()

  function insertMany(id,threads=[]){
    const obj = cache.get(id) || {}
    threads.forEach(thread=>{
      obj[thread.id] = thread
    })
    cache.set(id,obj)
    return threads
  }

  async function byThread(id){
    if(cache.has(id)){
      return Object.values(cache.get(id))
    }
    const result = await table.byThread(id)
    if(result.length){
      return insertMany(id,result)
    }
    return result
  }

  return {
    ...table,
    async set(id,data){
      await table.set(id,data)
      insertMany(data.threadid,[data])
      return data
    },
    byThread,
  }
}
