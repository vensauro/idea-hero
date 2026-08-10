import React, { forwardRef, useId } from "react";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className = "", id: customId, rows = 3, ...props }, ref) => {
    const defaultId = useId();
    const textareaId = customId || defaultId;

    return (
      <div className={`ui-field ${error ? "ui-field--error" : ""}`}>
        {label && (
          <label htmlFor={textareaId} className="ui-field__label">
            {label}
          </label>
        )}

        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          className={`ui-textarea ${className}`.trim()}
          {...props}
        />

        {error ? (
          <p className="ui-field__error">{error}</p>
        ) : hint ? (
          <p className="ui-field__hint">{hint}</p>
        ) : null}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
