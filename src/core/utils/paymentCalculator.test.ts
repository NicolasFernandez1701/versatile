import { describe, it, expect } from 'vitest';
import { calculatePayment, type PaymentCalcInput } from './paymentCalculator';

const baseArgs: PaymentCalcInput = {
  basePrice: 1000,
  paymentMethod: 'transferencia',
  promoDiscountPct: 0,
  applyLateFee: false,
  isFirstPayment: true,
  today: new Date(2024, 5, 15), // June 15, 2024 (30-day month)
};

describe('calculatePayment', () => {
  it('calculates prorated amount for a mid-month signup', () => {
    const result = calculatePayment(baseArgs);

    expect(result.daysInMonth).toBe(30);
    expect(result.daysRemaining).toBe(16);
    expect(result.proratedBase).toBeCloseTo(533.33, 2);
    expect(result.promoDiscountAmount).toBeCloseTo(0, 2);
    expect(result.cashDiscountAmount).toBeCloseTo(0, 2);
    expect(result.lateFeeAmount).toBeCloseTo(0, 2);
    expect(result.total).toBeCloseTo(533.33, 2);
    expect(result.expirationDate).toBe('2024-06-30');
  });

  it('does not prorate when signing up on day 1', () => {
    const result = calculatePayment({
      ...baseArgs,
      today: new Date(2024, 4, 1), // May 1, 2024 (31-day month)
    });

    expect(result.daysInMonth).toBe(31);
    expect(result.daysRemaining).toBe(31);
    expect(result.proratedBase).toBeCloseTo(1000, 2);
    expect(result.total).toBeCloseTo(1000, 2);
    expect(result.expirationDate).toBe('2024-05-31');
  });

  it('prorates to a single day on the last day of the month', () => {
    const result = calculatePayment({
      ...baseArgs,
      today: new Date(2024, 5, 30), // June 30, 2024
    });

    expect(result.daysRemaining).toBe(1);
    expect(result.proratedBase).toBeCloseTo(33.33, 2);
    expect(result.total).toBeCloseTo(33.33, 2);
  });

  it('prorates correctly for February with 28 days', () => {
    const result = calculatePayment({
      ...baseArgs,
      today: new Date(2023, 1, 15), // February 15, 2023 (non-leap year)
    });

    expect(result.daysInMonth).toBe(28);
    expect(result.daysRemaining).toBe(14);
    expect(result.proratedBase).toBeCloseTo(500, 2);
    expect(result.total).toBeCloseTo(500, 2);
    expect(result.expirationDate).toBe('2023-02-28');
  });

  it('applies a 10% promo discount on the prorated base', () => {
    const result = calculatePayment({
      ...baseArgs,
      promoDiscountPct: 10,
    });

    expect(result.proratedBase).toBeCloseTo(533.33, 2);
    expect(result.promoDiscountAmount).toBeCloseTo(53.33, 2);
    expect(result.total).toBeCloseTo(480, 2);
  });

  it('applies a 50% promo discount on the prorated base', () => {
    const result = calculatePayment({
      ...baseArgs,
      promoDiscountPct: 50,
    });

    expect(result.proratedBase).toBeCloseTo(533.33, 2);
    expect(result.promoDiscountAmount).toBeCloseTo(266.67, 2);
    expect(result.total).toBeCloseTo(266.66, 2);
  });

  it('applies a 15% cash discount on the prorated base', () => {
    const result = calculatePayment({
      ...baseArgs,
      paymentMethod: 'efectivo',
    });

    expect(result.proratedBase).toBeCloseTo(533.33, 2);
    expect(result.cashDiscountAmount).toBeCloseTo(80, 2);
    expect(result.total).toBeCloseTo(453.33, 2);
  });

  it('never applies a late fee to the first payment', () => {
    const result = calculatePayment({
      ...baseArgs,
      today: new Date(2024, 5, 20),
      applyLateFee: true,
    });

    expect(result.lateFeeAmount).toBeCloseTo(0, 2);
    expect(result.total).toBeCloseTo(366.67, 2); // 11/30 * 1000
  });

  it('charges the full price for recurring payments', () => {
    const result = calculatePayment({
      ...baseArgs,
      isFirstPayment: false,
    });

    expect(result.proratedBase).toBeCloseTo(1000, 2);
    expect(result.total).toBeCloseTo(1000, 2);
    expect(result.expirationDate).toBe('2024-06-30');
  });
});
