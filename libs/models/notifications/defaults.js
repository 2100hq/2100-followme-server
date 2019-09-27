const uuid = require('uuid/v4')
const {IncreasingId} = require('../../utils')
module.exports = config => {
  const id = IncreasingId()
  return (props={})=> {
    return {
      id:id(Date.now()),
      created:Date.now(),
      hasRead:false,
      ...props,
      updated:Date.now(),
    }
  }
}
