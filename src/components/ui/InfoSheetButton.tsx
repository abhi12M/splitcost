import * as Dialog from "@radix-ui/react-dialog";
import { Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface InfoSheetButtonProps {
  title: string;
  description: string;
  className?: string;
  iconClassName?: string;
}

export function InfoSheetButton({
  title,
  description,
  className,
  iconClassName,
}: InfoSheetButtonProps) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          type="button"
          aria-label={`More info about ${title}`}
          className={cn(
            "inline-flex items-center justify-center rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            className
          )}
        >
          <Info className={cn("h-4 w-4", iconClassName)} />
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-black/40 animate-in fade-in" />
        <Dialog.Content
          className={cn(
            "fixed bottom-0 left-0 right-0 z-[81] rounded-t-2xl bg-background p-4",
            "animate-in slide-in-from-bottom duration-200"
          )}
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <Dialog.Title className="text-sm font-semibold">{title}</Dialog.Title>

            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close info sheet"
                className="rounded-md p-1 hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <Dialog.Description className="whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
            {description}
          </Dialog.Description>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
