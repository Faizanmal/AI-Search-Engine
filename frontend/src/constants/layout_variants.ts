import { cva } from "class-variance-authority";

export const layoutVariants = cva(
  "w-full",
  {
    variants: {
      variant: {
        default: "",
        flex: "flex",
        "flex-col": "flex flex-col",
        "flex-row": "flex flex-row",
        grid: "grid",
        "flex-center": "flex items-center justify-center",
        "flex-between": "flex items-center justify-between",
        "flex-around": "flex items-center justify-around",
        "flex-start": "flex items-center justify-start",
        "flex-end": "flex items-center justify-end",
        stack: "flex flex-col space-y-4",
        "stack-sm": "flex flex-col space-y-2",
        "stack-lg": "flex flex-col space-y-6",
      },
      spacing: {
        none: "",
        xs: "p-2",
        sm: "p-4",
        default: "p-6",
        lg: "p-8",
        xl: "p-12",
        responsive: "p-4 md:p-6 lg:p-8",
      },
      width: {
        auto: "w-auto",
        full: "w-full",
        screen: "w-screen",
        fit: "w-fit",
        max: "w-max",
        min: "w-min",
      },
    },
    defaultVariants: {
      variant: "default",
      spacing: "none",
      width: "full",
    },
  }
);