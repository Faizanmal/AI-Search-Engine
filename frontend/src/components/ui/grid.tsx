import * as React from "react"
import { type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { gridVariants } from "@/constants/grid_variants"

export interface GridProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof gridVariants> {
  children: React.ReactNode
}

const Grid = React.forwardRef<HTMLDivElement, GridProps>(
  ({ className, variant, cols, gap, ...props }, ref) => {
    return (
      <div
        className={cn(gridVariants({ variant, cols, gap }), className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Grid.displayName = "Grid"

export { Grid }