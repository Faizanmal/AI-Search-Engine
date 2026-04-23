import { cva } from "class-variance-authority";

export const sectionVariants = cva(
  "w-full",
  {
    variants: {
      variant: {
        default: "",
        hero: "relative overflow-hidden",
        feature: "relative",
        testimonial: "relative bg-linear-to-br from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30",
        cta: "relative bg-linear-to-r from-purple-600/10 via-blue-600/10 to-pink-600/10",
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
        gradient: "bg-linear-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-950 dark:via-blue-950 dark:to-purple-950",
      },
    },
    defaultVariants: {
      variant: "default",
      spacing: "default",
      background: "transparent",
    },
  }
);