const uuid = require('uuid/v4')
module.exports = config => {
  return (props={})=> {
    return {
      id:props.id || uuid(),
      created:Date.now(),
      updated:Date.now(),
      ...props,
    }
  }
}
