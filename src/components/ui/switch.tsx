"use client"

import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-[1.35rem] w-9 shrink-0 items-center rounded-full border shadow-xs transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=checked]:bg-[--accent-primary] data-[state=checked]:border-[--accent-primary]/50",
        "data-[state=unchecked]:bg-[--bg-surface-2] data-[state=unchecked]:border-[--border-medium]",
        "focus-visible:border-[--accent-primary]/50 focus-visible:ring-[--accent-primary]/20",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block size-[1.1rem] rounded-full ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0",
          "data-[state=checked]:bg-white data-[state=unchecked]:bg-[--text-secondary]"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
