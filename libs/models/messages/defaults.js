const uuid = require('uuid/v4')
module.exports = config => {
  return (props={})=> {
    return {
      id:uuid(),
      created:Date.now(),
      ...props
    }
  }
}
