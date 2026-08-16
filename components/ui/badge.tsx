import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium transition-colors duration-150",
  {
    variants: {
      variant: {
        neutral: "border-zinc-200 bg-zinc-100 text-zinc-600",
        pending: "border-amber-200 bg-amber-50 text-amber-800",
        progress: "border-sky-200 bg-sky-50 text-sky-800",
        completed: "border-emerald-200 bg-emerald-50 text-emerald-800",
        off: "border-zinc-200 bg-zinc-100 text-zinc-500",
      },
    },
    defaultVariants: { variant: "neutral" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
