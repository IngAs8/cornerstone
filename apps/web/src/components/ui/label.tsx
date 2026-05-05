import { forwardRef, type LabelHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type LabelProps = LabelHTMLAttributes<HTMLLabelElement>;

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn("text-sm font-medium block mb-1.5", className)}
      {...props}
    />
  )
);

Label.displayName = "Label";
