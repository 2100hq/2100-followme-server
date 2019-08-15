const uuid = require('uuid/v4')
module.exports = (config) => {
  return (props = {}) => {
    return {
      id: uuid(),
      defaultThreshold:config.defaultThreshold,
      ...props,
    }
  }
}
