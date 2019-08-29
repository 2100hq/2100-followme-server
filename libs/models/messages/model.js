const lodash = require('lodash')
const Defaults = require('./defaults')
const Schema = require('./schema')
const Validate = require('../validate')
const assert = require('assert')

module.exports = (config,table,emit=x=>x) => {
  const defaults = Defaults()
  const validate = Validate(Schema())

  function isShortId(id){
    return id.indexOf('-') === -1
  }

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
    let result
    if (isShortId(id)){
      result = (await table.getByShortId(id))[0]
    } else {
      result = await table.get(id)
    }
    assert(result, 'Message not found')
    return result
  }

  function destroy(id){
    return table.destroy(id)
  }

  return {
    ...table,
    get,
    set,
    create,
    destroy
  }

}

