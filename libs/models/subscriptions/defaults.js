const uuid = require('uuid/v4')
const {md5} = require('../../utils')
module.exports = config => {
  return (props={})=> {
    return {
      id:md5(props.endpoint) || uuid(),
      created:Date.now(),
      ...props,
      updated:Date.now(),
    }
  }
}
