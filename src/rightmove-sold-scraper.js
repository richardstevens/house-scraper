const puppeteer = require('puppeteer')
const logger = require('logger')
const database = require('databases')
const timeout = { timeout: 5 * 1000 }
let outcodeData = require('../output/remaining.json')

// const screenshot = async (filename, page) => {
//   await page.screenshot({path: 'screenshots/' + filename + '.png'})
// }

const addProperty = `
  INSERT IGNORE
  INTO properties
  (number, postcode, address, price, type, hold, residential, newBuild, soldDate, bedrooms)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`

const getValueFor = async (opts = {}) => {
  const { page, waitForSelector, selector, defaultVal } = opts
  try {
    if (waitForSelector) {
      logger.debug('Waiting for', waitForSelector)
      await page.waitForSelector(waitForSelector, timeout)
    }
    await page.waitForSelector(selector, timeout)
    const value = await page.$eval(selector, el => el.innerText)
    logger.debug('Got', value, 'for', selector)
    return value || defaultVal
  } catch (e) {
    logger.warn(e)
    return defaultVal
  }
}

const scrape = async (url, page) => {
  await page.goto(url)
  // page.on('console', msg => console.log('PAGE LOG:', msg.text()))
  const properties = await page.evaluate(() => {
    const data = []
    const postcode = document.querySelector('#searchLocation').value
    for (var el of document.querySelectorAll('.soldDetails')) {
      const address = el.querySelector('.soldAddress').innerText
      const price = el.querySelector('.soldPrice').innerText.replace(/\D/g, '')
      const type = el.querySelector('.soldType').innerText.split(', ')
      const soldDate = el.querySelector('.soldDate').innerText
      const bedrooms = el.querySelector('.noBed').innerText.replace(/ bedrooms?/, '')
      data.push({
        number: address.split(', ').slice(0, 1)[0],
        postcode: postcode + ' ' + address.split(postcode + ' ').slice(-1)[0],
        address,
        price,
        type: type[0],
        hold: type[1],
        residential: type[2] ? type[2].indexOf('Residential') > -1 : false,
        newBuild: type[2] ? type[2].indexOf('New Build') > -1 : false,
        soldDate,
        bedrooms
      })
    }
    return data
  })
  return properties // Pass all results back
}

const runAll = async (outcode) => {
  const propertiesPerPage = 25
  const url = `http://www.rightmove.co.uk/house-prices/detail.html?country=england&locationIdentifier=OUTCODE%5E${outcode}&year=1&referrer=listChangeCriteria&index=`

  const browser = await puppeteer.launch({headless: true})
  const page = await browser.newPage()
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36')
  await page.setViewport({ width: 1024, height: 768 })
  await page.goto(url + '0')
  let totalPages = await getValueFor({
    page,
    selector: '.pagecount',
    defaultVal: 1
  })
  totalPages = Number(totalPages.toString().split(' ').slice(-1)[0])
  logger.info('Found', totalPages, 'pages')
  let properties = []
  for (let i = 0; i <= totalPages; i++) {
    const newUrl = url + (i * propertiesPerPage)
    properties = properties.concat(await scrape(newUrl, page))
  }
  browser.close()
  return properties // Pass all results back
}

if (process.env.outcode) outcodeData = [process.env.outcode]
if (!outcodeData.length) {
  logger.warn('No outcode provided')
  process.exit()
}
logger.info('Started timer', logger.timer('house-scraper'))

outcodeData.reduce((chain, outcode) => chain.then(async () => {
  logger.info('Started timer', logger.timer(outcode.outcode))
  await runAll(outcode.code)
    .then(results => {
      logger.debug(results)
      results.map(async house => {
        await database.query(addProperty, [
          house.number,
          house.postcode,
          house.address,
          house.price,
          house.type,
          house.hold,
          house.residential,
          house.newBuild,
          house.soldDate,
          house.bedrooms
        ])
      })
      logger.info('Finished for', outcode.outcode)
      logger.info('Ended timer', logger.timerEnd(outcode.outcode))
    })
}), Promise.resolve())
  .then(() => {
    logger.info('Ended timer', logger.timerEnd('house-scraper'))
    process.exit()
  })
