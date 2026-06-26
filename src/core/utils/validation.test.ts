import { describe, it, expect } from 'vitest';
import { isValidEmail, isTimeRangeValid, isError } from './validation';

describe('isValidEmail', () => {
  it('acepta emails válidos', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('test.user@domain.org')).toBe(true);
    expect(isValidEmail('a@b.co')).toBe(true);
  });

  it('rechaza emails sin @', () => {
    expect(isValidEmail('notanemail')).toBe(false);
  });

  it('rechaza emails sin dominio', () => {
    expect(isValidEmail('user@')).toBe(false);
    expect(isValidEmail('user@domain')).toBe(false);
  });

  it('rechaza string vacío', () => {
    expect(isValidEmail('')).toBe(false);
  });

  it('rechaza solo whitespace', () => {
    expect(isValidEmail('   ')).toBe(false);
  });

  it('rechaza emails con espacios internos', () => {
    expect(isValidEmail('user @example.com')).toBe(false);
  });
});

describe('isTimeRangeValid', () => {
  it('acepta rango válido (end > start)', () => {
    expect(isTimeRangeValid('09:00', '10:00')).toBe(true);
    expect(isTimeRangeValid('08:00', '20:00')).toBe(true);
    expect(isTimeRangeValid('23:00', '23:30')).toBe(true);
  });

  it('rechaza times iguales', () => {
    expect(isTimeRangeValid('10:00', '10:00')).toBe(false);
  });

  it('rechaza end antes que start', () => {
    expect(isTimeRangeValid('14:00', '10:00')).toBe(false);
    expect(isTimeRangeValid('23:00', '08:00')).toBe(false);
  });

  it('rechaza midnight boundary (no overnight)', () => {
    expect(isTimeRangeValid('23:00', '00:30')).toBe(false);
  });
});

describe('isError type guard', () => {
  it('returns true para Error instances', () => {
    expect(isError(new Error('test'))).toBe(true);
    expect(isError(new TypeError('type'))).toBe(true);
  });

  it('returns false para strings', () => {
    expect(isError('error message')).toBe(false);
  });

  it('returns false para null y undefined', () => {
    expect(isError(null)).toBe(false);
    expect(isError(undefined)).toBe(false);
  });

  it('returns false para objetos planos', () => {
    expect(isError({ message: 'error' })).toBe(false);
  });
});
