import { cva } from "class-variance-authority";

export const containerVariants = cva(
  "w-full mx-auto",
  {
    variants: {
      variant: {
        default: "container-padding",
        full: "px-0",
        narrow: "max-w-4xl container-padding",
        wide: "max-w-7xl container-padding",
        fluid: "max-w-none container-padding",
      },
      size: {
        sm: "max-w-2xl",
        default: "max-w-6xl",
        lg: "max-w-7xl",
        xl: "max-w-[1440px]",
        full: "max-w-none",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);