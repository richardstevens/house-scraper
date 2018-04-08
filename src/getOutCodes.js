const request = require('superagent')
const Throttle = require('superagent-throttle')
const fs = require('fs')
const throttle = new Throttle({
  active: true,     // set false to pause queue
  rate: 500,         // how many requests can be sent every `ratePer`
  ratePer: 5000,    // number of ms in which `rate` requests may be sent
  concurrent: 2     // how many requests can be sent concurrently
})

const outcodeReqs = [...Array(2950)]
  .map((_, code) => {
    return `http://api.rightmove.co.uk/api/sale/find?index=0&sortType=2&numberOfPropertiesRequested=1&locationIdentifier=OUTCODE%5E${code + 1}&apiApplication=IPAD`
  })

const reqFunctions = outcodeReqs
  .map((req, index) => {
    return new Promise((resolve, reject) => {
      request
        .get(req)
        .use(throttle.plugin())
        .end((err, data) => {
          data = data.body
          if (err) return resolve(null)
          if (data.result !== 'SUCCESS') {
            console.error('Something went wrong on area ' + (index + 1))
            return resolve(null)
          } else {
            console.log('Just got', (index + 1))
            return resolve(data)
          }
        })
    })
  })

const makeRequests = () => {
  Promise.all(reqFunctions)
  .then(res => {
    res = res
      .filter(data => data)
      .filter(data => !data.error)
    const outcodeData = res
      .map(data => {
        return {
          code: Number(data.searchableLocation.identifier.split('^')[1]),
          outcode: data.searchableLocation.name
        }
      })
    if (outcodeData.length) {
      fs.mkdirSync('./output')
      fs.writeFileSync('./output/outcodeData.json', JSON.stringify(outcodeData), 'utf8')
    }
  })
}

makeRequests()
