import { cva } from "class-variance-authority";

export const sectionVariants = cva(
  "w-full",
  {
    variants: {
      variant: {
        default: "",
        hero: "relative overflow-hidden",
        feature: "relative",
        testimonial: "relative bg-[var(--sea-light)]/40",
        cta: "relative bg-[var(--ocean)]/5",
      },
      spacing: {
        none: "",
        sm: "section-spacing-sm",
        default: "section-spacing",
        lg: "py-20 md:py-28 lg:py-36",
        xl: "py-24 md:py-32 lg:py-40",
      },
      background: {
        transparent: "bg-transparent",
        primary: "bg-background",
        secondary: "bg-secondary/30",
        muted: "bg-muted/30",
        gradient: "app-atmosphere",
      },
    },
    defaultVariants: {
      variant: "default",
      spacing: "default",
      background: "transparent",
    },
  }
);