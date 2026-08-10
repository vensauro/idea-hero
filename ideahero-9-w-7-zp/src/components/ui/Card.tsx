import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "paper" | "sun" | "pink" | "teal" | "dark";
  interactive?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = "paper",
  interactive = false,
  className = "",
  ...props
}) => {
  return (
    <div
      className={`ui-card ui-card--${variant} ${interactive ? "ui-card--interactive" : ""} ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
};
