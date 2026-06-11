"use client"

import * as React from "react"
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group"
import { Radio as RadioPrimitive } from "@base-ui/react/radio"

import { cn } from "@/lib/utils"

function RadioGroup({
  className,
  ...props
}: RadioGroupPrimitive.Props) {
  return (
    <RadioGroupPrimitive
      data-slot="radio-group"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function RadioGroupItem({
  className,
  children,
  ...props
}: RadioPrimitive.Root.Props) {
  return (
    <label
      className={cn(
        "flex items-center gap-2 text-sm font-medium cursor-pointer",
        className
      )}
    >
      <RadioPrimitive.Root
        data-slot="radio-group-item"
        className="flex size-4 items-center justify-center rounded-full border border-input outline-none focus-visible:ring-3 focus-visible:ring-ring/50 data-checked:border-primary data-checked:bg-primary"
        {...props}
      >
        <RadioPrimitive.Indicator className="flex items-center justify-center data-unchecked:hidden">
          <span className="size-1.5 rounded-full bg-primary-foreground" />
        </RadioPrimitive.Indicator>
      </RadioPrimitive.Root>
      {children}
    </label>
  )
}

export { RadioGroup, RadioGroupItem }
