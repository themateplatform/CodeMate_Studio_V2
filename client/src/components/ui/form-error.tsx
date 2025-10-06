import * as React from "react"
import { cn } from "@/lib/utils"
import { AlertCircle } from "lucide-react"

export interface FormErrorProps extends React.HTMLAttributes<HTMLParagraphElement> {
  error?: string
}

const FormError = React.forwardRef<HTMLParagraphElement, FormErrorProps>(
  ({ error, className, ...props }, ref) => {
    if (!error) return null
    
    return (
      <p
        ref={ref}
        role="alert"
        className={cn(
          "flex items-center gap-2 text-sm text-destructive mt-1",
          className
        )}
        {...props}
      >
        <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
        <span>{error}</span>
      </p>
    )
  }
)
FormError.displayName = "FormError"

export { FormError }
