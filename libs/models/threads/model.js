const lodash = require('lodash')
const Defaults = require('./defaults')
const Schema = require('./schema')
const Validate = require('../validate')
const assert = require('assert')

module.exports = (config,table,emit=x=>x) => {
  const defaults = Defaults()
  const validate = Validate(Schema())

  async function create(props) {
    props = defaults(props)
    if(props.id) assert(!await table.has(props.id), 'Thread exists with id')
    return set(props)
  }

  async function set(props) {
    props = validate(defaults(props))
    await table.set(props.id,props)
    emit('change',props)
    return props
  }

  async function get(id) {
    const result = await table.get(id)
    assert(result, 'Thread not found')
    return result
  }

  function destroyByMessageid(messageid){
    return table.destroyByMessageid(messageid)
  }

  function getByThreadIdMessageId(threadid, messageid){
    return table.filter({threadid, messageid})
  }


  return {
    ...table,
    get,
    set,
    create,
    destroyByMessageid,
    getByThreadIdMessageId
  }

}

