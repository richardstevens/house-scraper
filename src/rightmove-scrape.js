const fs = require('fs')
const request = require('superagent')
const pages = 50 // Max number returned from pagination
let outcodeData = require('../output/outcodeData.json')

outcodeData = outcodeData.reduce((acc, val) => {
  acc[val.outcode] = val.code
  return acc
}, {})

const makeReq = reqGenerator => {
  return function (...args) {
    return new Promise(function (resolve, reject) {
      let req
      try {
        req = reqGenerator(...args)
      } catch (e) {
        reject(e)
      }
      const pageData = getAllPages(req)
      resolve(pageData)
    })
  }
}

const getAllPages = async page => {
  let offset = 0, remaining = true
  let pageData = []
  do {
    const url = page + '&index=' + offset
    const response = await request.get(url)
    remaining = response.body.properties.length
    offset += pages
    pageData = [...pageData, ...response.body.properties]
  }
  while (remaining)
  return pageData
}

module.exports = {
  byOutcode: makeReq(outcode => {
    if (typeof outcode !== 'string') throw new Error(`byOutcode was expecting a string, but got ${outcode} (${typeof outcode})`)
    outcode = outcode.toUpperCase().trim()
    const locIdent = outcodeData[outcode]
    if (!locIdent) throw new Error(`byOutcode could not find the outcode specified (${outcode}), either the value is invalid, or your outcodeData.json file is out of date.`)
    return `http://api.rightmove.co.uk/api/sale/find?sortType=2&numberOfPropertiesRequested=50&locationIdentifier=OUTCODE%5E${locIdent}&apiApplication=IPAD`
  }),
  propertyDetail: makeReq(function (propertyId) {
    if (!propertyId) throw new Error(`expecting propertyId, but got ${propertyId}`)
    return `http://api.rightmove.co.uk/api/propertyDetails?propertyId=${propertyId}&apiApplication=IPAD`
  })
}
