"use client";

import { cn } from "@/app/lib/utils";
import { Slot } from "@radix-ui/react-slot";
import { motion, type HTMLMotionProps } from "framer-motion";
import { forwardRef } from "react";

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "ref"> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  asChild?: boolean;
}

const MotionSlot = motion.create(Slot);

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", asChild = false, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-semibold transition-all duration-300 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus-visible:ring-2 focus-visible:ring-offset-2";

    const variants = {
      primary:
        "bg-primary text-white hover:bg-primary/90 focus:ring-primary focus-visible:ring-primary shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40",
      secondary:
        "bg-secondary text-white hover:bg-secondary/90 focus:ring-secondary focus-visible:ring-secondary shadow-lg shadow-secondary/30",
      outline:
        "border-2 border-primary text-primary hover:bg-primary hover:text-white focus:ring-primary focus-visible:ring-primary",
      ghost:
        "text-foreground hover:bg-foreground/10 focus:ring-foreground focus-visible:ring-foreground",
    };

    const sizes = {
      sm: "px-4 py-2 text-sm",
      md: "px-6 py-3 text-base",
      lg: "px-8 py-4 text-lg",
    };

    const Comp = asChild ? MotionSlot : motion.button;

    return (
      <Comp
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        ref={ref}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button };
export type { ButtonProps };
