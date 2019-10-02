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
    console.log('creating subscription',props)
    if(props.id) assert(!await table.has(props.id), 'Subscription exists with id')
    return set(props)
  }

  async function set(props) {
    props = validate(defaults(props))
    await table.set(props.id,props)
    emit('change',props)
    return props
  }

  async function get(id) {
    let result
    result = await table.get(id)
    assert(result, 'Subcription not found')
    return result
  }

  async function remove(props){
    await table.delete(props.id)
    emit('delete',props)
    return props
  }

  return {
    ...table,
    get,
    set,
    create,
    remove,
  }

}

