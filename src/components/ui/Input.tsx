import React, { type InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, rightElement, className = '', id, ...props }, ref) => {
    // Generate a stable ID if none is provided, useful for linking label and input
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className={`form-group ${className}`.trim()}>
        {label && <label htmlFor={inputId}>{label}</label>}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          {icon && (
            <div
              style={{
                position: 'absolute',
                left: '1rem',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              {icon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={error ? 'input-error' : ''}
            style={{
              ...(icon ? { paddingLeft: '2.75rem' } : {}),
              ...(rightElement ? { paddingRight: '2.75rem' } : {})
            }}
            {...props}
          />
          {rightElement && (
            <div
              style={{ position: 'absolute', right: '1rem', display: 'flex', alignItems: 'center' }}
            >
              {rightElement}
            </div>
          )}
        </div>
        {error && (
          <span
            style={{
              color: 'var(--error-color)',
              fontSize: '0.8rem',
              marginTop: '0.25rem',
              display: 'block'
            }}
          >
            {error}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
