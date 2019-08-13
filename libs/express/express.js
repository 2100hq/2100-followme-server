var Express = require('express')
var lodash = require('lodash')

var cors = require('cors')
var bodyParser = require('body-parser')
var bearerToken = require('express-bearer-token')
var cookieParser = require('cookie-parser')

const ActionRouter = require('./action-router')
const AuthRouter = require('./auth-router')

var assert = require('assert')

module.exports = async (config, {actions,users,authenticate}) => {
  assert(config.port, 'requires express port')
  var app = Express()

  app.use(cors())
  app.use(bodyParser.json({ limit: '50mb' }))
  app.use(bodyParser.urlencoded({ extended: true }))
  app.use(cookieParser(config.secret))
  app.use(bearerToken())
  app.use(AuthRouter(config,{users,authenticate}))

  app.get('/', (req, res, next) => {
    return res.json({
      success: true,
    })
  })

  lodash.each(actions,(actions,name)=>{
    console.log('adding actions to express:',name)
    app.use('/' + name,ActionRouter(config,actions))
  })

  app.use(function(req, res, next) {
    console.log(req.path)
    next(new Error('Invalid Request'))
  })

  app.use(function(err, req, res, next) {
    // console.log('errror',err)
    res.status(500).send(err.message || err)
  })

  return new Promise(res => {
    app.listen(config.port, function() {
      console.log('Express-actions listening on port', config.port)
      res(app)
    })
  })
}

