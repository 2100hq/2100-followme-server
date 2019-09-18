const { Table } = require('../../utils').Rethink
const assert = require('assert')

module.exports = async (config, con) => {
  assert(config.table, 'requires table name')

  const schema = {
    table: config.table,
    indices: ['userid'],
    compound:[
      {name:'userRead',fields:['userid','hasRead']},
    ]
  }

  const table = await Table(con, schema)

  // table.getByUser = userid => {
  //   assert(userid, 'requires userid')
  //   return table.getBy('userid', userid)
  // }

  return {
    ...table,
    userRead(userid,read=false){
      return table.getBy('userRead',[userid,read])
    },
    set(id,props){
      return table.upsert(props)
    },
    destroy(id){
      return table.run(table.table().get(id).delete())
    },
  }
}

