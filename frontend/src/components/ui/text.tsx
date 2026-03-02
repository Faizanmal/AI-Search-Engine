import * as React from "react"
import { type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { textVariants } from "@/constants/text_variants"

export interface TextProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof textVariants> {
  children: React.ReactNode
  as?: "p" | "span" | "div" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6"
}

const Text = React.forwardRef<HTMLElement, TextProps>(
  ({ className, variant, size, weight, align, as = "p", children, ...props }, ref) => {
    const Component = as
    
    return (
      <Component
        className={cn(textVariants({ variant, size, weight, align }), className)}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ref={ref as any}
        {...props}
      >
        {children}
      </Component>
    )
  }
)
Text.displayName = "Text"

export { Text }