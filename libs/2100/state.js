const lodash = require('lodash')
module.exports = (state,emit=x=>x) => (channel) => {
  return (...args)=>{
    // console.log(channel,...args)
    if(args[0].length){
      lodash.set(state[channel],...args)
    }else{
      state[channel] = args[1]
    }
    emit(channel,state)
  }
}

