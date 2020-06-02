const { transactionLineItems } = require('../api-util/lineItems');
const { types } = require('sharetribe-flex-sdk');
const { Money } = types;

// TODO: sdk util module with, getSdk(req), getTrustedSdk(req), etc.

const fetchListing = listingId => {
  // TODO
  return Promise.resolve({ attributes: { unitPrice: new Money(1000, 'EUR') } });
};

module.exports = (req, res) => {
  const { listingId, bookingData } = req.body;
  console.log('bookingData:', JSON.stringify(bookingData, null, '  '));
  console.log('listingId:', listingId);

  fetchListing(listingId)
    .then(listing => {
      const lineItems = transactionLineItems(listing, bookingData);
      console.log('lineItems:', JSON.stringify(lineItems, null, '  '));
      res
        .status(200)
        .json(lineItems)
        .end();
    })
    .catch(e => {
      console.error(e);
      res
        .status(500)
        .json({ error: e.message })
        .end();
    });
};
