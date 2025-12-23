import * as React from "react"

const TooltipProvider = ({ children }: { children: React.ReactNode; delayDuration?: number }) => <>{children}</>

const Tooltip = ({ children }: { children: React.ReactNode }) => <div className="relative group">{children}</div>

const TooltipTrigger = ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => <>{children}</>

const TooltipContent = ({ children, className, side }: { children: React.ReactNode; className?: string; side?: string }) => (
  <div className={`absolute z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 hidden group-hover:block ${className}`}>
    {children}
  </div>
)

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
