const { getTrustedSdk } = require('../api-util/sdk');

const log = (...args) => {
  const formattedArgs = args.map(arg => {
    if (typeof arg === 'object') {
      return JSON.stringify(arg, null, '  ');
    }
    return arg;
  });
  console.log.apply(console, formattedArgs);
};

module.exports = (req, res) => {
  const { isInitiate, isSpeculative, listingId, bodyParams, queryParams } = req.body;

  log('================================================================');
  log('privileged transition');
  log('isInitiate:', isInitiate);
  log('isSpeculative:', isSpeculative);
  log('listingId:', listingId);
  log('bodyParams:', bodyParams);
  log('queryParams:', queryParams);

  // TODO: fetch listing, create line items

  getTrustedSdk(req)
    .then(trustedSdk => {
      log('initiating/transitioning tx with trusted SDK');

      // initiate
      if (isInitiate && !isSpeculative) {
        return trustedSdk.transactions.initiate(bodyParams, queryParams);
      }

      // initiate speculative
      if (isInitiate && isSpeculative) {
        return trustedSdk.transactions.initiateSpeculative(bodyParams, queryParams);
      }

      // transition
      if (!isInitiate && !isSpeculative) {
        return trustedSdk.transactions.transition(bodyParams, queryParams);
      }

      // transition speculative
      if (!isInitiate && isSpeculative) {
        return trustedSdk.transactions.transitionSpeculative(bodyParams, queryParams);
      }

      throw new Error(
        'Privileged transition should be initiate or transition and normal or speculative.'
      );
    })
    .then(response => {
      log('response from tx initiate/transition:', response);
      res
        .status(response.status)
        .json(response.data)
        .end();
    })
    .catch(e => {
      log('error in tx initiate');
      log('status:', e.status, 'status text:', e.statusText);
      log('error data:', e.data);
      res
        .status(500)
        .json({ message: e.message })
        .end();
    });
};
