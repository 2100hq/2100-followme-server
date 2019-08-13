const test = require('tape')
const Promise = require('bluebird')
const lodash = require('lodash')
const { Model, Defaults, Schema, Rethink } = require('.')
const {RethinkConnection} = require('../../utils')

test('threads',t=>{
  let rethink,threadid
  t.test('rethink',t=>{
    t.test('init',async t=>{
      const con = await RethinkConnection({db:'test'}).catch(t.end)
      t.ok(con)
      rethink = await Rethink({table:'test_threads'},con).catch(t.end)
      t.ok(rethink)
      await rethink.drop()
      t.end()
    })
    t.test('create',async t=>{
      threadid = 'threadtest'
      const defaults = Defaults()

      const threads = lodash.times(100,i=>{
        return defaults({
          threadid,
          messageid:'messagetest' + i 
        })
      })
      await Promise.map(threads,thread=>{
        // console.log(thread)
        return rethink.upsert(thread)
      })
      t.ok(threads)
      t.end()
    })
    t.test('between',async t=>{
      const messages = await rethink.between(threadid)
      console.log(messages)
      // messages.each(message=>{
      //   console.log(message)
      // })
      t.end()
    })
  })
})
