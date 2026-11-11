import { describe, it, expect } from 'vitest';
import { getErrorMessage } from './errorMessage';

describe('getErrorMessage', () => {
  it('devuelve el mensaje de una instancia de Error', () => {
    expect(getErrorMessage(new Error('boom'), 'fallback')).toBe('boom');
  });

  it('devuelve el mensaje de un PostgrestError, que NO es una instancia de Error', () => {
    const postgrestError = {
      message: 'null value in column "studio_id" violates not-null constraint',
      details: null,
      hint: null,
      code: '23502',
    };

    expect(getErrorMessage(postgrestError, 'Error guardando datos')).toBe(
      'null value in column "studio_id" violates not-null constraint',
    );
  });

  it('devuelve el string cuando se lanza un string', () => {
    expect(getErrorMessage('algo salió mal', 'fallback')).toBe('algo salió mal');
  });

  it('usa el fallback cuando el mensaje está vacío o solo tiene espacios', () => {
    expect(getErrorMessage(new Error(''), 'fallback')).toBe('fallback');
    expect(getErrorMessage({ message: '   ' }, 'fallback')).toBe('fallback');
  });

  it('usa el fallback para valores que no aportan mensaje', () => {
    expect(getErrorMessage(null, 'fallback')).toBe('fallback');
    expect(getErrorMessage(undefined, 'fallback')).toBe('fallback');
    expect(getErrorMessage({ code: '42501' }, 'fallback')).toBe('fallback');
    expect(getErrorMessage(42, 'fallback')).toBe('fallback');
  });
});
