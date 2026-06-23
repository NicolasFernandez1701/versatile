import React, { type SelectHTMLAttributes } from 'react';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string | number; label: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className = '', id, ...props }, ref) => {
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className={`form-group ${className}`.trim()}>
        {label && <label htmlFor={selectId}>{label}</label>}
        <select id={selectId} ref={ref} className={error ? 'input-error' : ''} {...props}>
          {options.map((opt, i) => (
            <option key={`${opt.value}-${i}`} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
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

Select.displayName = 'Select';
