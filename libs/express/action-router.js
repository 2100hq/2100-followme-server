const Express = require('express')
const lodash = require('lodash')
module.exports = (config, actions) => {
  const router = Express.Router()

  router.get('/:action', (req, res, next) => {
    console.log('get calling',req.params,req.body)
    actions(req.user,req.params.action,req.query)
      .then(res.json.bind(res))
      .catch(next)
  })

  router.post('/:action', (req, res, next) => {
    console.log('post calling',req.params,req.body)
    actions(req.user,req.params.action,req.body)
      .then(res.json.bind(res))
      .catch(next)
  })

  return router

}
