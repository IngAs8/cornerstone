import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "destructive";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-foreground text-background hover:opacity-90 disabled:opacity-50",
  secondary:
    "bg-foreground/10 text-foreground hover:bg-foreground/15 disabled:opacity-50",
  outline:
    "border border-foreground/20 bg-transparent hover:bg-foreground/5 disabled:opacity-50",
  ghost:
    "bg-transparent hover:bg-foreground/5 disabled:opacity-50",
  destructive:
    "bg-red-600 text-white hover:bg-red-700 disabled:opacity-50",
};

const sizeStyles: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm rounded-md",
  md: "px-4 py-2 text-sm rounded-md",
  lg: "px-6 py-3 text-base rounded-md",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", fullWidth, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 disabled:cursor-not-allowed",
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && "w-full",
        className
      )}
      {...props}
    />
  )
);

Button.displayName = "Button";
