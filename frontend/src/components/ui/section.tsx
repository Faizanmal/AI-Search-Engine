import * as React from "react"
import { type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { sectionVariants } from "@/constants/section_variants"

export interface SectionProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof sectionVariants> {
  children: React.ReactNode
  as?: "section" | "div" | "main" | "article" | "aside"
}

const Section = React.forwardRef<HTMLElement, SectionProps>(
  ({ className, variant, spacing, background, as = "section", children, ...props }, ref) => {
    const Component = as
    
    return (
      <Component
        className={cn(sectionVariants({ variant, spacing, background }), className)}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ref={ref as any}
        {...props}
      >
        {children}
      </Component>
    )
  }
)
Section.displayName = "Section"

export { Section }