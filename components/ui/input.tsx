import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground border-input h-12 md:h-10 w-full min-w-0 rounded-xl md:rounded-lg border bg-card/90 dark:bg-input/30 px-4 md:px-3 py-2 text-base md:text-sm shadow-sm transition-[color,box-shadow] outline-none file:inline-flex file:h-8 md:file:h-7 file:border-0 file:bg-transparent file:px-3 file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
