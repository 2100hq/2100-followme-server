const Users = require('./users')
const Threads = require('./threads')
const LazyCache = require('./lazy-cache')
const Messages = require('./messages')
module.exports = async (config,{con},emit=x=>x) => {
  return {
    users:Users.Model(config,await Users.Rethink({table:'users'},con),(...args)=>emit('users',...args)),
    threads:Threads.Model(config,
      await Threads.Memtable(config,await Threads.Rethink({table:'threads'},con)),
      // Threads.Cache(config,await Threads.Rethink({table:'threads'},con)),
      (...args)=>emit('threads',...args)),
    messages:Messages.Model(config,
      LazyCache(config,await Messages.Rethink({table:'messages'},con)),
      (...args)=>emit('messages',...args)),
  }
}
