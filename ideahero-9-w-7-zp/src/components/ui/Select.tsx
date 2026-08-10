import React, { forwardRef, useId } from "react";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options?: SelectOption[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, children, className = "", id: customId, ...props }, ref) => {
    const defaultId = useId();
    const selectId = customId || defaultId;

    return (
      <div className={`ui-field ${error ? "ui-field--error" : ""}`}>
        {label && (
          <label htmlFor={selectId} className="ui-field__label">
            {label}
          </label>
        )}

        <div className="ui-select-wrapper">
          <select
            ref={ref}
            id={selectId}
            className={`ui-select ${className}`.trim()}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <span className="ui-select-wrapper__arrow" aria-hidden="true">
            ▼
          </span>
        </div>

        {error ? (
          <p className="ui-field__error">{error}</p>
        ) : hint ? (
          <p className="ui-field__hint">{hint}</p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = "Select";
