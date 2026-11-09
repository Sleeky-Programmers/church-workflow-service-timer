import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * The Church Workflow input look, as a class string so SyncedInput and
 * native selects can share it.
 */
export const inputClass = cn(
  "h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm transition-colors",
  "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type = "text", ...props }, ref) => (
    <input ref={ref} type={type} className={cn(inputClass, className)} {...props} />
  ),
);
Input.displayName = "Input";

export const Select = React.forwardRef<HTMLSelectElement, React.ComponentProps<"select">>(
  ({ className, ...props }, ref) => <select ref={ref} className={cn(inputClass, "pr-8", className)} {...props} />,
);
Select.displayName = "Select";
