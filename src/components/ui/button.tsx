import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-bold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00f2ff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[#0a0a0a]/60 backdrop-blur-md border border-[#00f2ff]/50 text-[#00f2ff] shadow-[0_0_15px_rgba(0,242,255,0.15)] hover:bg-[#00f2ff] hover:text-[#050505] hover:border-[#00f2ff] hover:shadow-[0_0_30px_rgba(0,242,255,0.6)] hover:-translate-y-0.5",
        destructive:
          "bg-red-500 text-zinc-50 shadow-sm hover:bg-red-500/90 hover:shadow-[0_0_15px_rgba(239,68,68,0.4)]",
        outline:
          "border border-zinc-800 bg-transparent text-zinc-300 shadow-sm hover:bg-[#00f2ff]/10 hover:text-[#00f2ff] hover:border-[#00f2ff]/50",
        secondary:
          "bg-zinc-800/80 backdrop-blur-sm text-zinc-50 border border-zinc-700 shadow-sm hover:bg-zinc-700",
        ghost: "text-zinc-300 hover:bg-[#00f2ff]/10 hover:text-[#00f2ff]",
        link: "text-[#00f2ff] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
