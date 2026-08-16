// Deliberately a plain native <select>, not a Radix combobox: schedule and
// status dropdowns need to be fast to operate with a mouse or keyboard
// during live shift work, and native selects are the least friction there.
import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            "focus-ring h-9 w-full appearance-none rounded-md border border-zinc-300 bg-white px-3 pr-8 text-sm shadow-sm disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
      </div>
    );
  }
);
Select.displayName = "Select";

export { Select };
