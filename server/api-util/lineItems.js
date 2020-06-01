const {
  calculateQuantityFromDates,
  calculateTotalFromLineItems,
  consrtuctValidLineItems,
} = require('./lineItemHelpers');
const { types } = require('sharetribe-flex-sdk');
const { Money } = types;

const unitType = 'line-item/night';
const PROVIDER_COMMISSION_PERCENTAGE = -15;
const CUSTOMER_COMMISSION_PERCENTAGE = 10;

/** Expected output:
  `lineItems`: Collection of line items (max 50). Each line items has following fields:
    - `code`: string, mandatory, indentifies line item type (e.g. \"line-item/cleaning-fee\"), maximum length 64 characters.
    - `unitPrice`: money, mandatory
    - `lineTotal`: money
    - `quantity`: number
    - `percentage`: number (e.g. 15.5 for 15.5%)
    - `seats`: number
    - `units`: number
    - `includeFor`: array containing strings \"customer\" or \"provider\", default [\":customer\"  \":provider\" ]

  Line item must have either `quantity` or `percentage` or both `seats` and `units`.

  `includeFor` defines commissions. Customer commission is added by defining `includeFor` array `[\"customer\"]` and provider commission by `[\"provider\"]`.

 */

exports.transactionLineItems = (listing, bookingData) => {
  const unitPrice = listing.attributes.unitPrice;
  const { startDate, endDate } = bookingData;

  const booking = {
    code: 'line-item/nights',
    unitPrice,
    quantity: calculateQuantityFromDates(startDate, endDate, unitType),
    includeFor: ['customer', 'provider'],
  };

  const cleaningFee = {
    code: 'line-item/cleaning-fee',
    unitPrice: new Money(7500, 'USD'),
    quantity: 1,
    includeFor: ['customer', 'provider'],
  };

  const providerCommission = {
    code: 'line-item/provider-commission',
    unitPrice: calculateTotalFromLineItems([booking, cleaningFee]),
    percentage: PROVIDER_COMMISSION_PERCENTAGE,
    includeFor: ['provider'],
  };

  const customerCommission = {
    code: 'line-item/customer-commission',
    unitPrice: calculateTotalFromLineItems([booking, cleaningFee]),
    percentage: CUSTOMER_COMMISSION_PERCENTAGE,
    includeFor: ['customer'],
  };

  const providerCommissionDiscount = {
    code: 'line-item/provider-commission-discount',
    unitPrice: new Money(2500, 'USD'),
    quantity: 1,
    includeFor: ['provider'],
  };

  const lineItems = [
    booking,
    cleaningFee,
    providerCommission,
    customerCommission,
    providerCommissionDiscount,
  ];

  return consrtuctValidLineItems(lineItems);
};

console.log('Construct line-items:');
console.log(
  this.transactionLineItems(
    { attributes: { unitPrice: new Money(5000, 'USD') } },
    { startDate: new Date(2020, 0, 1, 12, 0, 0), endDate: new Date(2020, 0, 3, 12, 0, 0) }
  )
);
