import * as React from "react"
import { type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { layoutVariants } from "@/constants/layout_variants"

export interface LayoutProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof layoutVariants> {
  children: React.ReactNode
}

const Layout = React.forwardRef<HTMLDivElement, LayoutProps>(
  ({ className, variant, spacing, width, ...props }, ref) => {
    return (
      <div
        className={cn(layoutVariants({ variant, spacing, width }), className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Layout.displayName = "Layout"

export { Layout }