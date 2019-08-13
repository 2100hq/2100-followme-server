module.exports = (config,libs) => {
  return () => {
    return {
      echo(...args){
        return args
      }
    }
  }
}
