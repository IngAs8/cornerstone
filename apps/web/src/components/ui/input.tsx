import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "w-full px-3 py-2 rounded-md border border-foreground/15 bg-background text-foreground",
        "focus:outline-none focus:border-foreground/40 transition-colors",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "placeholder:text-foreground/40",
        className
      )}
      {...props}
    />
  )
);

Input.displayName = "Input";
