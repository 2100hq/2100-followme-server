const lodash = require('lodash')
const assert = require('assert')
const pad = require('pad')
const Rethink = require('rethinkdb')
const bn = require('bignumber.js')
const shortlink = require('shortlink')
const urlRegex = require('url-regex');
const getUrls = require('get-urls');
const {unfurl} = require('unfurl.js')
let {url:unminifyUrl}  = require('unfurl-url');
const {promisify} = require('util')
const nodeURL = require('url');
unminifyUrl=promisify(unminifyUrl)

exports.loop = async (fn, delay = 1000, max, count = 0, result) => {
  assert(lodash.isFunction(fn), 'loop requires a function')
  if (max && count >= max) return result
  result = await fn(count)
  await new Promise(res => setTimeout(res, delay))
  return exports.loop(fn, delay, max, count + 1, result)
}

exports.IncreasingId = (start=0,max=10000000)=>{
  let nonce = start
  return (prefix=Date.now())=>{
    const id = [prefix,pad(8,nonce,'0')].join('!')
    nonce = (nonce + 1) % max
    return id
  }
}

exports.Rethink = require('rethink-table')

let rethinkConnection = null
exports.RethinkConnection = async config => {
  assert(config, 'requires rethink config')
  assert(config.db, 'requires rethink.db')
  if (rethinkConnection) return rethinkConnection
  rethinkConnection = await Rethink.connect(config)
  return exports.Rethink.Utils.createDB(rethinkConnection, config.db)
}

exports.ethToWei = eth => {
  return bn(eth).times('10000000000000000').toString()
}

exports.hideMessage = message => {
  return {
    id:message.id,
    shortid: message.shortid,
    userid:message.userid,
    created:message.created,
    message: message.message.replace(/\S/g,'x'),
    length:message.message.length,
    threshold:message.threshold,
    tokenid:message.tokenid,
    hint:message.hint,
    hidden:true,
    type: exports.getMessageType(message),
    recipientCount: message.recipientCount || 0,
    recipients: message.recipients || [],
  }
}

exports.showMessage = message => {
  const type = exports.getMessageType(message)
  const link = exports.getLink(message)
  const {linkMetadata, ...visible} = message
  return {...visible, type, link}
}

exports.shortId = length => shortlink.generate(length)

exports.isImageUrl = url => /\.png|jpg|gif$/.test(nodeURL.parse(url||'').pathname)
exports.isImageContentType = contentType => /image/i.test(contentType)

exports.getLinkMetadata = async message => {
  let linkMetadata
  let url = Array.from(getUrls(message))[0]
  if (!url) return null
  url = await unminifyUrl(url)
  try {
    linkMetadata = await unfurl(url) // this throws sometimes
  } catch(e){
    console.log('UNFURL threw')
    console.log(url)
    console.log(e);
    console.log();

    if (e.info) linkMetadata = e.info
  }
  if (!linkMetadata) return null
  return JSON.parse(JSON.stringify({...linkMetadata, url})) // sanitize linkMetaData
}

exports.getMessageType = messagedoc => {
  if (/meme/i.test(messagedoc.type)) return messagedoc.type
  if (/gift/i.test(messagedoc.type)) return messagedoc.type
  let type
  let { linkMetadata, message } = messagedoc

  if (!linkMetadata) return 'text'
  let {contentType} = linkMetadata
  const url = exports.getLink(messagedoc)

  // if message contains only a link
  if (urlRegex({exact: true, strict: false}).test(message)){
    type = 'link'
  } else {
    return 'text'
  }

  // if link is an image, label it and return
  if (exports.isImageUrl(url) || exports.isImageContentType(contentType)) return 'image'

  // process metadata
  let siteName = lodash.get(linkMetadata, 'open_graph.site_name')
  if (!/twitter|youtube|imgur/i.test(siteName)) siteName = null
  if (/twitter/i.test(siteName) && !/status/i.test(nodeURL.parse(url).pathname)) siteName = null // not a status update
  let ogType = lodash.get(linkMetadata, 'open_graph.type')

  if (/video/i.test(ogType)) ogType = 'video'
  if (/image/i.test(ogType)) ogType = 'image'

  if (!/image|video/.test(ogType)) ogType = null

  type = siteName || ogType || type

  return type.toLowerCase()
}

exports.getFavicon = messagedoc => lodash.get(messagedoc, 'linkMetadata.favicon')

// link differs from 'linkMetadata.url' in that it uses the open graph url to the media, and other stuff for imgur
exports.getLink = messagedoc => {
  const { linkMetadata } = messagedoc
  if (!linkMetadata) return
  let {url} = linkMetadata
  url = lodash.get(linkMetadata, 'open_graph.url', url)
  let siteName = lodash.get(linkMetadata, 'open_graph.site_name')
  if (/imgur/i.test(siteName)) {
    const streamurl = lodash.get(linkMetadata, 'twitter_card.players[0].stream')
    const imageurl = lodash.get(linkMetadata, 'twitter_card.images[0].url')
    url = streamurl || imageurl || url
  }
  return url
}
