import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "../../lib/utils"

export type CheckedState = boolean | 'indeterminate';

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onCheckedChange?: (checked: CheckedState) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, onCheckedChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onCheckedChange?.(e.target.checked);
      props.onChange?.(e);
    };

    return (
      <div className="relative flex items-center">
        <input
          type="checkbox"
          ref={ref}
          className={cn(
            "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground appearance-none",
            className
          )}
          onChange={handleChange}
          {...props}
        />
        <Check className="absolute h-3 w-3 text-white pointer-events-none hidden peer-checked:block left-0.5" />
      </div>
    )
  }
)
Checkbox.displayName = "Checkbox"

export { Checkbox }
