import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> { }

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full text-base bg-background",
        "placeholder:text-muted-foreground",
        "pr-4",
        "h-10 rounded-md border border-input px-3 py-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "aria-[invalid=true]:border-destructive",
        "aria-[invalid=true]:focus:border-transparent",
        "min-h-[6rem] h-[6rem] sm:min-h-[16rem] sm:h-[16rem] resize-none",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
