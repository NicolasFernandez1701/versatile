import { useState, useCallback } from 'react';

export interface UseDateInputResult {
  value: string;
  setValue: (value: string) => void;
  age: string;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function calculateAge(dateString: string): number {
  const [dd, mm, yyyy] = dateString.split('/');
  const birth = new Date(parseInt(yyyy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10));
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function maskDate(input: string): string {
  let digits = input.replace(/\D/g, '');
  if (digits.length > 8) digits = digits.substring(0, 8);

  if (digits.length > 4) {
    return `${digits.substring(0, 2)}/${digits.substring(2, 4)}/${digits.substring(4, 8)}`;
  }
  if (digits.length > 2) {
    return `${digits.substring(0, 2)}/${digits.substring(2, 4)}`;
  }
  return digits;
}

export function useDateInput(): UseDateInputResult {
  const [value, setValue] = useState('');

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = maskDate(e.target.value);
    setValue(masked);
  }, []);

  const age = value.length === 10 ? calculateAge(value).toString() : '';

  return {
    value,
    setValue,
    age,
    handleChange,
  };
}
