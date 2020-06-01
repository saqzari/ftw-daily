const Decimal = require('decimal.js');
const moment = require('moment');
const has = require('lodash/has');
const { types } = require('sharetribe-flex-sdk');
const { Money } = types;

const LINE_ITEM_NIGHT = 'line-item/night';
const LINE_ITEM_DAY = 'line-item/day';

// https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Number/MAX_SAFE_INTEGER
// https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Number/MIN_SAFE_INTEGER
// https://stackoverflow.com/questions/26380364/why-is-number-max-safe-integer-9-007-199-254-740-991-and-not-9-007-199-254-740-9
const MIN_SAFE_INTEGER = Number.MIN_SAFE_INTEGER || -1 * (2 ** 53 - 1);
const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER || 2 ** 53 - 1;

const isSafeNumber = decimalValue => {
  if (!(decimalValue instanceof Decimal)) {
    throw new Error('Value must be a Decimal');
  }
  return decimalValue.gte(MIN_SAFE_INTEGER) && decimalValue.lte(MAX_SAFE_INTEGER);
};

/** Helper functions for handling dates*/

/**
 * Calculate the number of nights between the given dates
 *
 * @param {Date} startDate start of the time period
 * @param {Date} endDate end of the time period
 *
 * @throws Will throw if the end date is before the start date
 * @returns {Number} number of nights between the given dates
 */
const nightsBetween = (startDate, endDate) => {
  const nights = moment(endDate).diff(startDate, 'days');
  if (nights < 0) {
    throw new Error('End date cannot be before start date');
  }
  return nights;
};

/**
 * Calculate the number of days between the given dates
 *
 * @param {Date} startDate start of the time period
 * @param {Date} endDate end of the time period. NOTE: with daily
 * bookings, it is expected that this date is the exclusive end date,
 * i.e. the last day of the booking is the previous date of this end
 * date.
 *
 * @throws Will throw if the end date is before the start date
 * @returns {Number} number of days between the given dates
 */
const daysBetween = (startDate, endDate) => {
  const days = moment(endDate).diff(startDate, 'days');
  if (days < 0) {
    throw new Error('End date cannot be before start date');
  }
  return days;
};

/** Helper functions for handling currency */

// See: https://en.wikipedia.org/wiki/ISO_4217
// See: https://stripe.com/docs/currencies
const subUnitDivisors = {
  AUD: 100,
  CAD: 100,
  CHF: 100,
  CNY: 100,
  DKK: 100,
  EUR: 100,
  GBP: 100,
  HKD: 100,
  INR: 100,
  JPY: 1,
  MXN: 100,
  NOK: 100,
  NZD: 100,
  SEK: 100,
  SGD: 100,
  USD: 100,
};

// Get the minor unit divisor for the given currency
const unitDivisor = currency => {
  if (!has(subUnitDivisors, currency)) {
    throw new Error(`No minor unit divisor defined for currency: ${currency}`);
  }
  return subUnitDivisors[currency];
};

// Divisor can be positive value given as Decimal, Number, or String
const convertDivisorToDecimal = divisor => {
  try {
    const divisorAsDecimal = new Decimal(divisor);
    if (divisorAsDecimal.isNegative()) {
      throw new Error(`Parameter (${divisor}) must be a positive number.`);
    }
    return divisorAsDecimal;
  } catch (e) {
    throw new Error(`Parameter (${divisor}) must present a number.`, e);
  }
};

// Detect if the given value is a goog.math.Long object
// See: https://google.github.io/closure-library/api/goog.math.Long.html
const isGoogleMathLong = value => {
  return typeof value === 'object' && isNumber(value.low_) && isNumber(value.high_);
};

/**
 * Converts given value to sub unit value and returns it as a number
 *
 * @param {Number|String} value
 *
 * @param {Decimal|Number|String} subUnitDivisor - should be something that can be converted to
 * Decimal. (This is a ratio between currency's main unit and sub units.)
 *
 * @param {boolean} useComma - optional.
 * Specify if return value should use comma as separator
 *
 * @return {number} converted value
 */
const convertUnitToSubUnit = (value, subUnitDivisor, useComma = false) => {
  const subUnitDivisorAsDecimal = convertDivisorToDecimal(subUnitDivisor);

  if (!(typeof value === 'string' || typeof value === 'number')) {
    throw new TypeError('Value must be either number or string');
  }

  const val = typeof value === 'string' ? convertToDecimal(value, useComma) : new Decimal(value);
  const amount = val.times(subUnitDivisorAsDecimal);

  if (!isSafeNumber(amount)) {
    throw new Error(
      `Cannot represent money minor unit value ${amount.toString()} safely as a number`
    );
  } else if (amount.isInteger()) {
    return amount.toNumber();
  } else {
    throw new Error(`value must divisible by ${subUnitDivisor}`);
  }
};

/**
 * Convert Money to a number
 *
 * @param {Money} value
 *
 * @return {Number} converted value
 */
const convertMoneyToNumber = value => {
  if (!(value instanceof Money)) {
    throw new Error('Value must be a Money type');
  }
  const subUnitDivisorAsDecimal = convertDivisorToDecimal(unitDivisor(value.currency));
  let amount;

  if (isGoogleMathLong(value.amount)) {
    // TODO: temporarily also handle goog.math.Long values created by
    // the Transit tooling in the Sharetribe JS SDK. This should be
    // removed when the value.amount will be a proper Decimal type.

    // eslint-disable-next-line no-console
    console.warn('goog.math.Long value in money amount:', value.amount, value.amount.toString());

    amount = new Decimal(value.amount.toString());
  } else {
    amount = new Decimal(value.amount);
  }

  if (!isSafeNumber(amount)) {
    throw new Error(
      `Cannot represent money minor unit value ${amount.toString()} safely as a number`
    );
  }

  return amount.dividedBy(subUnitDivisorAsDecimal).toNumber();
};

/** Helper functions for constructing line items*/

/**
 * Calculates lineTotal for lineItem based on quantity.
 * The total will be `unitPrice * quantity`.
 *
 * @param {Money} unitPrice
 * @param {int} percentage
 *
 * @returns {Money} lineTotal
 */
exports.calculateTotalPriceFromQuantity = (unitPrice, unitCount) => {
  const numericPrice = convertMoneyToNumber(unitPrice);
  const numericTotalPrice = new Decimal(numericPrice).times(unitCount).toNumber();
  return new Money(
    convertUnitToSubUnit(numericTotalPrice, unitDivisor(unitPrice.currency)),
    unitPrice.currency
  );
};

/**
 * Calculates lineTotal for lineItem based on percentage.
 * The total will be `unitPrice * (percentage / 100)`.
 *
 * @param {Money} unitPrice
 * @param {int} percentage
 *
 * @returns {Money} lineTotal
 */
exports.calculateTotalPriceFromPercentage = (unitPrice, percentage) => {
  const numericPrice = convertMoneyToNumber(unitPrice);
  const numericTotalPrice = new Decimal(numericPrice)
    .times(percentage)
    .dividedBy(100)
    .toNumber();
  return new Money(
    convertUnitToSubUnit(numericTotalPrice, unitDivisor(unitPrice.currency)),
    unitPrice.currency
  );
};

/**
 * Calculates lineTotal for lineItem based on seats and units.
 * The total will be `unitPrice * units * seats`.
 *
 * @param {Money} unitPrice
 * @param {int} unitCount
 * @param {int} seats
 *
 * @returns {Money} lineTotal
 */
exports.calculateTotalPriceFromSeats = (unitPrice, unitCount, seats) => {
  const numericPrice = convertMoneyToNumber(unitPrice);
  const numericTotalPrice = new Decimal(numericPrice)
    .times(unitCount)
    .times(seats)
    .toNumber();
  return new Money(
    convertUnitToSubUnit(numericTotalPrice, unitDivisor(unitPrice.currency)),
    unitPrice.currency
  );
};

/**
 * Calculates the quantity based on the booking start and end dates depending on booking type.
 *
 * @param {Date} startDate
 * @param {Date} endDate
 * @param {string} type
 *
 * @returns {number} quantity
 */
exports.calculateQuantityFromDates = (startDate, endDate, type) => {
  if (type === LINE_ITEM_NIGHT) {
    return nightsBetween(startDate, endDate);
  } else if (type === LINE_ITEM_DAY) {
    return daysBetween(startDate, endDate);
  }
  throw new Error(`Can't calculate quantity from dates to unit type: ${type}`);
};

/**
 *
 *  `lineTotal` is calculated by the following rules:
 * - If `quantity` is provided, the line total will be `unitPrice * quantity`.
 * - If `percentage` is provided, the line total will be `unitPrice * (percentage / 100)`.
 * - If `seats` and `units` are provided the line item will contain `quantity` as a product of `seats` and `units` and the line total will be `unitPrice * units * seats`.
 *
 * @param {Object} lineItem
 * @return {Money} lineTotal
 *
 */
exports.calculateLineTotal = lineItem => {
  const { code, unitPrice, quantity, percentage, seats, units } = lineItem;

  if (quantity) {
    return this.calculateTotalPriceFromQuantity(unitPrice, quantity);
  } else if (percentage) {
    return this.calculateTotalPriceFromPercentage(unitPrice, percentage);
  } else if (seats && units) {
    return this.calculateTotalPriceFromSeats(unitPrice, units, seats);
  } else {
    console.error(
      "Can't calculate the lineTotal of lineItem: ",
      code,
      ' Make sure the lineItem has quantity, percentage or both seats and units'
    );
  }
};

/**
 * Calculates the total sum of lineTotals for given lineItems
 *
 * @param {Array} lineItems
 * @retuns {Money} total sum
 */
exports.calculateTotalFromLineItems = lineItems => {
  const numericTotalPrice = lineItems.reduce((sum, lineItem) => {
    const lineTotal = this.calculateLineTotal(lineItem);
    const numericPrice = convertMoneyToNumber(lineTotal);
    return new Decimal(numericPrice).add(sum);
  }, 0);

  const unitPrice = lineItems[0].unitPrice;

  return new Money(
    convertUnitToSubUnit(numericTotalPrice.toNumber(), unitDivisor(unitPrice.currency)),
    unitPrice.currency
  );
};

/**
 * Calculates the total sum of lineTotals for given lineItems where `includeFor` includes `provider`
 * @param {*} lineItems
 * @returns {Money} total sum
 */
exports.calculateTotalForProvider = lineItems => {
  const providerLineItems = lineItems.filter(lineItem => lineItem.includeFor.includes('provider'));
  return this.calculateTotalFromLineItems(providerLineItems);
};

/**
 * Calculates the total sum of lineTotals for given lineItems where `includeFor` includes `customer`
 * @param {*} lineItems
 * @returns {Money} total sum
 */
exports.calculateTotalForCustomer = lineItems => {
  const providerLineItems = lineItems.filter(lineItem => lineItem.includeFor.includes('customer'));
  return this.calculateTotalFromLineItems(providerLineItems);
};

exports.consrtuctValidLineItems = lineItems => {
  const lineItemsWithTotals = lineItems.map(lineItem => {
    const { code, quantity, percentage } = lineItem;

    if (!/^line-item\/.+/.test(code)) {
      throw new Error(`Invalid line item code: ${code}`);
    }

    // lineItems are expected to be in similar format as when they are returned from API
    // so that we can use them in e.g. BookingBreakdown component.
    // This means we need to convert quantity to Decimal and add attributes lineTotal and reversal to lineItems
    const lineTotal = this.calculateLineTotal(lineItem);
    return {
      ...lineItem,
      lineTotal,
      quantity: quantity ? new Decimal(quantity) : null,
      percentage: percentage ? new Decimal(percentage) : null,
      reversal: false,
    };
  });

  //TODO do we want to validate payout and payin sums?

  return lineItemsWithTotals;
};
