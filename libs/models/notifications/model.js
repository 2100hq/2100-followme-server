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
    if(props.id) assert(!await table.has(props.id), 'Notification exists with id')
    return set(props)
  }

  async function set(props) {
    props = validate(defaults(props))
    await table.set(props.id,props)
    emit('change',props)
    return props
  }

  async function get(id) {
    let result = await table.get(id)
    assert(result, 'Notification not found')
    return result
  }

  async function read(id,hasRead=true){
    const result = await get(id)
    result.hasRead = hasRead
    return set(result)
  }

  return {
    ...table,
    get,
    set,
    create,
    read,
  }

}

