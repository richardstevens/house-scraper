const rightmoveApi = require('./rightmove-scrape')

const tab = '    '

rightmoveApi
  .byOutcode('TN23')
  .then(data => data.map(item => {
    console.log('')
    console.log('Type:', item.propertyType)
    console.log(tab, item.address.replace(/(\n|\r)/g, ' ').replace(/\s+/g, ' '))
    console.log(tab, '£' + Number(item.price).toLocaleString())
    console.log(tab, 'Rooms:', item.bedrooms)
    console.log(tab, 'Photos:', item.photoCount)
    console.log(tab, 'Floor Plans:', item.floorplanCount)
    console.log(tab, 'Branch:', item.brandName)
    console.log(tab, 'Premium listing?', item.premiumDisplay)
  }))
  .catch(console.log)
