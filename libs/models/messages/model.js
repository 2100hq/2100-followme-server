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
    if(props.id) assert(!await table.has(props.id), 'Message exists with id')
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
    assert(result, 'Message not found')
    return result
  }

  return {
    ...table,
    get,
    set,
    create,
  }

}

