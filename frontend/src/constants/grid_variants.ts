import { cva } from "class-variance-authority";

export const gridVariants = cva(
  "grid w-full",
  {
    variants: {
      variant: {
        default: "grid",
        autoFit: "grid-auto-fit",
        responsive: "grid-responsive",
      },
      cols: {
        1: "grid-cols-1",
        2: "grid-cols-1 md:grid-cols-2",
        3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
        4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
        5: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5",
        6: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6",
        auto: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-auto",
      },
      gap: {
        none: "gap-0",
        xs: "gap-2",
        sm: "gap-3 md:gap-4",
        default: "gap-4 md:gap-6",
        lg: "gap-6 md:gap-8",
        xl: "gap-8 md:gap-10",
        "2xl": "gap-10 md:gap-12",
      },
    },
    defaultVariants: {
      variant: "default",
      cols: 3,
      gap: "default",
    },
  }
);