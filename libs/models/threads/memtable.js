const Memtable = require('memtable')
const moment = require('moment')
const assert = require('assert')
const highland = require('highland')
module.exports = async (config, table, emit=x=>x) =>{

  function paginate(date,duration='hour'){
    const result = moment(date).startOf(duration).valueOf()
    return result.toString()
  }

  const cache = Memtable({
    indexes:[
      {name:'thread',index:'threadid',unique:false,required:true},
      {name:'hour',index:thread=>paginate(thread.created,'hour'),unique:false,required:true}
    ]
  })


  function byThread(id){
    return [...cache.getBy('thread',id)]
  }

  function byHour(hour,threadid){
    assert(hour,'requires hour')
    assert(threadid,'requires thread id')
    return cache.filter(thread=>{
      return thread.threadid === threadid
    },'hour',hour)
  }

  async function set(id,data){
    await table.set(id,data)
    return cache.set(data)
  }

  //warm cache
  await table.readStream().doto(cache.setSilent).last().toPromise(Promise)

  return {
    ...cache,
    byThread,
    byHour,
    set,
  }
}

