import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-primary/70 bg-primary/20 text-primary",
        secondary: "border-cyan-500/40 bg-cyan-500/15 text-cyan-100",
        destructive: "border-red-500/70 bg-red-500/15 text-red-100 hover:bg-red-500/25",
        outline: "border-border text-foreground",
        werewolf: "border-transparent bg-red-900 text-red-100",
        villager: "border-transparent bg-blue-900 text-blue-100",
        seer: "border-transparent bg-purple-900 text-purple-100",
        doctor: "border-transparent bg-green-900 text-green-100",
        hunter: "border-transparent bg-orange-900 text-orange-100",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
