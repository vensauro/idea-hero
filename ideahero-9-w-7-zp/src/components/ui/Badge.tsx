import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "pink" | "teal" | "sun" | "lime" | "purple" | "neutral";
  size?: "sm" | "md";
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "pink",
  size = "md",
  className = "",
  ...props
}) => {
  return (
    <span
      className={`ui-badge ui-badge--${variant} ui-badge--${size} ${className}`.trim()}
      {...props}
    >
      {children}
    </span>
  );
};
