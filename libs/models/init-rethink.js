const Users = require('./users')
const Threads = require('./threads')
const LazyCache = require('./lazy-cache')
const Messages = require('./messages')
const Notifications = require('./notifications')
module.exports = async (config,{con},emit=x=>x) => {
  return {
    users:Users.Model(config,await Users.Rethink({table:'users'},con),(...args)=>emit('users',...args)),
    notifications:Notifications.Model(config,await Notifications.Rethink({table:'notifications'},con),(...args)=>emit('notifications',...args)),
    threads:Threads.Model(config,
      Threads.Cache(config,await Threads.Rethink({table:'threads'},con)),
      (...args)=>emit('threads',...args)),
    messages:Messages.Model(config,
      LazyCache(config,await Messages.Rethink({table:'messages'},con)),
      (...args)=>emit('messages',...args)),
  }
}
