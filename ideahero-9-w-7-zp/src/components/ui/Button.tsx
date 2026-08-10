import React, { forwardRef } from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "gold";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      isLoading = false,
      icon,
      className = "",
      disabled,
      ...props
    },
    ref
  ) => {
    const baseClass = "ui-button";
    const variantClass = `ui-button--${variant}`;
    const sizeClass = `ui-button--${size}`;
    const loadingClass = isLoading ? "ui-button--loading" : "";

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseClass} ${variantClass} ${sizeClass} ${loadingClass} ${className}`.trim()}
        {...props}
      >
        {isLoading ? (
          <span className="ui-button__spinner" aria-hidden="true">
            ✦
          </span>
        ) : icon ? (
          <span className="ui-button__icon">{icon}</span>
        ) : null}
        <span className="ui-button__label">{children}</span>
      </button>
    );
  }
);

Button.displayName = "Button";
