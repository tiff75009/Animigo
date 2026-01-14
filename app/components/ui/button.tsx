"use client";

import { cn } from "@/app/lib/utils";
import { Slot } from "@radix-ui/react-slot";
import { motion } from "framer-motion";
import { forwardRef } from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    const baseStyles =
      "inline-flex items-center justify-center font-semibold transition-all duration-300 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2";

    const variants = {
      primary:
        "bg-primary text-white hover:bg-primary/90 focus:ring-primary shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40",
      secondary:
        "bg-secondary text-white hover:bg-secondary/90 focus:ring-secondary shadow-lg shadow-secondary/30",
      outline:
        "border-2 border-primary text-primary hover:bg-primary hover:text-white focus:ring-primary",
      ghost:
        "text-foreground hover:bg-foreground/10 focus:ring-foreground",
    };

    const sizes = {
      sm: "px-4 py-2 text-sm",
      md: "px-6 py-3 text-base",
      lg: "px-8 py-4 text-lg",
    };

    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Comp
          className={cn(baseStyles, variants[variant], sizes[size], className)}
          ref={ref}
          {...props}
        />
      </motion.div>
    );
  }
);

Button.displayName = "Button";

export { Button };
