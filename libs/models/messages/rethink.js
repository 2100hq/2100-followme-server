const { Table } = require('../../utils').Rethink
const assert = require('assert')

module.exports = async (config, con) => {
  assert(config.table, 'requires table name')

  const schema = {
    table: config.table,
    indices: ['username', 'shortid'],
  }

  const table = await Table(con, schema)

  // table.getByUser = userid => {
  //   assert(userid, 'requires userid')
  //   return table.getBy('userid', userid)
  // }

  return {
    ...table,
    getByShortId(id){
      return table.getBy('shortid', id)
    },
    set(id,props){
      return table.upsert(props)
    },
    destroy(id){
      return table.run(table.table().get(id).delete())
    },
  }
}

