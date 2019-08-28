const { Table } = require('../../utils').Rethink
const assert = require('assert')

module.exports = async (config, con) => {
  assert(config.table, 'requires table name')

  console.log(config)
  const schema = {
    table: config.table,
    indices: ['messageid','threadid'],
  }

  const table = await Table(con, schema)

  // table.getByUser = userid => {
  //   assert(userid, 'requires userid')
  //   return table.getBy('userid', userid)
  // }

  return {
    ...table,
    set(id,props){
      return table.upsert(props)
    },
    destroyByMessageid(messageid){
      return table.run(table.table().filter({messageid}).delete())
    },
    between(threadid,start=0,end=Date.now()){
      const query = table.table()
        .between([threadid,start].join('!'),[threadid,end].join('!'),{rightBound:'open',leftBound:'open'})
        .orderBy({index:'id'})
        .coerceTo('array')
      // for some reason stream will not return in order
      // return table.readStream(query)
      return table.run(query)
    },
  }
}

