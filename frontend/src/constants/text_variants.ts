import { cva } from "class-variance-authority";

export const textVariants = cva(
  "text-foreground",
  {
    variants: {
      variant: {
        default: "",
        muted: "text-muted-foreground",
        primary: "text-primary",
        secondary: "text-secondary-foreground",
        accent: "text-accent-foreground",
        destructive: "text-destructive",
        gradient: "bg-linear-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent",
        "gradient-secondary": "bg-linear-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent",
      },
      size: {
        xs: "text-xs",
        sm: "text-sm", 
        default: "text-base",
        lg: "text-lg",
        xl: "text-xl",
        "2xl": "text-2xl",
        "3xl": "text-3xl",
        "4xl": "text-4xl",
      },
      weight: {
        normal: "font-normal",
        medium: "font-medium",
        semibold: "font-semibold",
        bold: "font-bold",
        extrabold: "font-extrabold",
      },
      align: {
        left: "text-left",
        center: "text-center",
        right: "text-right",
        justify: "text-justify",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      weight: "normal",
      align: "left",
    },
  }
);