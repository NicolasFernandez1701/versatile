export interface PaymentCalcInput {
  basePrice: number;
  paymentMethod: 'efectivo' | 'transferencia';
  promoDiscountPct: number;
  applyLateFee: boolean;
  isFirstPayment: boolean;
  today: Date;
}

export interface PaymentCalcResult {
  proratedBase: number;
  promoDiscountAmount: number;
  cashDiscountAmount: number;
  lateFeeAmount: number;
  total: number;
  expirationDate: string;
  daysInMonth: number;
  daysRemaining: number;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function toISODateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function calculatePayment(input: PaymentCalcInput): PaymentCalcResult {
  const { basePrice, paymentMethod, promoDiscountPct, applyLateFee, isFirstPayment, today } = input;

  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysRemaining = daysInMonth - today.getDate() + 1;

  const shouldProrate = isFirstPayment && daysRemaining < daysInMonth;
  const proratedBase = round2(shouldProrate ? (basePrice * daysRemaining) / daysInMonth : basePrice);

  const promoDiscountAmount = round2((proratedBase * promoDiscountPct) / 100);
  const cashDiscountAmount = round2(
    paymentMethod === 'efectivo' ? proratedBase * 0.15 : 0
  );
  const lateFeeAmount = round2(applyLateFee && !isFirstPayment ? basePrice * 0.2 : 0);

  const total = round2(proratedBase - promoDiscountAmount - cashDiscountAmount + lateFeeAmount);
  const expirationDate = toISODateLocal(new Date(year, month + 1, 0));

  return {
    proratedBase,
    promoDiscountAmount,
    cashDiscountAmount,
    lateFeeAmount,
    total,
    expirationDate,
    daysInMonth,
    daysRemaining,
  };
}
