const Express = require('express')
const lodash = require('lodash')
const assert = require('assert')
module.exports = (config, {users,authenticate}) => {
  assert(users,'requires users')
  assert(authenticate,'requires authenticate')
  const router = Express.Router()

  router.use((req,res,next)=>{
    if(req.token == null) return next()
    authenticate(req.token).then(userid=>{
      return users.getOrCreate(userid)
    }).then(user=>{
      req.user = user
      next()
    })
    .catch(err=>{
      console.log('auth err',err)
      next()
    })
  })

  return router
}

