const {IncreasingId} = require('../../utils')
module.exports = config => {
  const id = IncreasingId()
  return (props={})=> {
    return {
      id:id([props.threadid,Date.now()].join('!')),
      created:Date.now(),
      ...props
    }
  }
}
