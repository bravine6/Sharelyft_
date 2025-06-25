import * as React from "react"
import { Link } from "react-router-dom"
import { cn } from "@/utils/cn"
import { buttonVariants } from "./button"
import type { VariantProps } from "class-variance-authority"

interface LinkButtonProps extends React.AnchorHTMLAttributes<HTMLAnchorElement>,
  VariantProps<typeof buttonVariants> {
  href: string;
  children: React.ReactNode;
}

const LinkButton = React.forwardRef<HTMLAnchorElement, LinkButtonProps>(
  ({ className, variant, size, href, children, ...props }, ref) => {
    return (
      <Link
        to={href}
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {children}
      </Link>
    )
  }
)

LinkButton.displayName = "LinkButton"

export { LinkButton }