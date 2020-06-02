const { types } = require('sharetribe-flex-sdk');
const { Money } = types;
const { convertMoneyToNumber, convertUnitToSubUnit } = require('./currency');

describe('currency utils', () => {
  describe('convertUnitToSubUnit(value, subUnitDivisor)', () => {
    const subUnitDivisor = 100;
    it('numbers as value', () => {
      expect(convertUnitToSubUnit(0, subUnitDivisor)).toEqual(0);
      expect(convertUnitToSubUnit(10, subUnitDivisor)).toEqual(1000);
      expect(convertUnitToSubUnit(1, subUnitDivisor)).toEqual(100);
    });

    it('strings as value', () => {
      expect(convertUnitToSubUnit('0', subUnitDivisor)).toEqual(0);
      expect(convertUnitToSubUnit('10', subUnitDivisor)).toEqual(1000);
      expect(convertUnitToSubUnit('1', subUnitDivisor)).toEqual(100);
      expect(convertUnitToSubUnit('0.10', subUnitDivisor)).toEqual(10);
      expect(convertUnitToSubUnit('10,99', subUnitDivisor)).toEqual(1099);
    });

    it('wrong type', () => {
      expect(() => convertUnitToSubUnit({}, subUnitDivisor)).toThrowError(
        'Value must be either number or string'
      );
      expect(() => convertUnitToSubUnit([], subUnitDivisor)).toThrowError(
        'Value must be either number or string'
      );
      expect(() => convertUnitToSubUnit(null, subUnitDivisor)).toThrowError(
        'Value must be either number or string'
      );
    });

    it('wrong subUnitDivisor', () => {
      expect(() => convertUnitToSubUnit(1, 'asdf')).toThrowError();
    });
  });

  describe('convertMoneyToNumber(value)', () => {
    it('Money as value', () => {
      expect(convertMoneyToNumber(new Money(10, 'USD'))).toBeCloseTo(0.1);
      expect(convertMoneyToNumber(new Money(1000, 'USD'))).toBeCloseTo(10);
      expect(convertMoneyToNumber(new Money(9900, 'USD'))).toBeCloseTo(99);
      expect(convertMoneyToNumber(new Money(10099, 'USD'))).toBeCloseTo(100.99);
    });

    it('Wrong type of a parameter', () => {
      expect(() => convertMoneyToNumber(10)).toThrowError('Value must be a Money type');
      expect(() => convertMoneyToNumber('10')).toThrowError('Value must be a Money type');
      expect(() => convertMoneyToNumber(true)).toThrowError('Value must be a Money type');
      expect(() => convertMoneyToNumber({})).toThrowError('Value must be a Money type');
      expect(() => convertMoneyToNumber(new Money('asdf', 'USD'))).toThrowError(
        '[DecimalError] Invalid argument'
      );
    });
  });
});
