const test = require('tape')
const { Model, Defaults, Schema, Rethink } = require('.')
const Cache = require('../cache')

test('users', t => {
  t.test('defaults', t => {
    let defaults
    t.test('init', t => {
      console.log(defaults)
      defaults = Defaults()
      t.ok(defaults)
      t.end()
    })
    t.test('call', t => {
      const result = defaults({})
      t.ok(result)
      t.end()
    })
  })
  t.test('model', t => {
    let cache,model
    t.test('init', t => {
      cache = Cache()
      model = Model({},cache)
      t.ok(cache)
      t.end()
    })
    t.test('create', async t => {
      const result = await model.create({id:'test', username: 'test' })
      t.equal(result.username, 'test')
      t.end()
    })
  })
})
