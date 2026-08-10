import React, { forwardRef, useId } from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, className = "", id: customId, ...props }, ref) => {
    const defaultId = useId();
    const inputId = customId || defaultId;

    return (
      <div className={`ui-field ${error ? "ui-field--error" : ""}`}>
        {label && (
          <label htmlFor={inputId} className="ui-field__label">
            {label}
          </label>
        )}

        <div className="ui-input-wrapper">
          {icon && <span className="ui-input-wrapper__icon">{icon}</span>}
          <input
            ref={ref}
            id={inputId}
            className={`ui-input ${icon ? "ui-input--has-icon" : ""} ${className}`.trim()}
            {...props}
          />
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

Input.displayName = "Input";
