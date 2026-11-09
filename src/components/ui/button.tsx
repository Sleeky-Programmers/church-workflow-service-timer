import { cva } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";

import type { VariantProps } from "class-variance-authority";
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary font-medium text-primary-foreground shadow hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        white: "bg-primary text-white shadow hover:bg-primary/90",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        primary:
          "bg-primary text-primary-foreground px-6 shadow hover:bg-primary/90",
        starred: "bg-primary/15 text-primary hover:bg-primary/20",
        pill: "rounded-full px-4 py-1.5 text-sm font-medium transition-all",
        filter:
          "bg-transparent hover:border border-gray-300 text-gray-700 hover:bg-transparent active:bg-transparent focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1",
        filterHeader:
          "bg-transparent hover:bg-transparent text-sm px-0 py-1 justify-between w-full focus-visible:ring-0 focus:outline-none",
        chipRemove:
          "p-0 h-auto w-auto rounded-none bg-transparent text-current hover:text-red-500 focus-visible:ring-0",
        rowRemove:
          "p-1 h-auto w-auto rounded bg-transparent text-red-400 hover:text-red-600 focus-visible:ring-0",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
