import React, { type ButtonHTMLAttributes } from 'react';
import { Loader } from './Loader';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'icon';
  loading?: boolean;
  icon?: React.ReactNode;
}

export function Button({
  children,
  variant = 'primary',
  loading = false,
  icon,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  let baseClass = `btn-${variant}`;
  if (variant === 'icon') {
    baseClass = 'icon-btn';
  } else if (variant === 'danger') {
    baseClass = 'icon-btn text-danger'; // For now, all danger buttons are icons in the tables. We can expand this later.
  }

  return (
    <button
      className={`${baseClass} ${className}`.trim()}
      disabled={loading || disabled}
      {...props}
    >
      {loading ? (
        <>
          <Loader size="small" text="" />
          {variant !== 'icon' && children}
        </>
      ) : (
        <>
          {icon && icon}
          {children}
        </>
      )}
    </button>
  );
}
