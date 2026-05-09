import { Drawer } from "vaul";
import { Info, X } from "lucide-react";
import { useState } from "react";
import { useBackButtonClose } from "@/hooks/useBackButtonClose";
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
  const [open, setOpen] = useState(false);

  useBackButtonClose(open, () => setOpen(false));

  return (
    <Drawer.Root open={open} onOpenChange={setOpen}>
      <Drawer.Trigger asChild>
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
      </Drawer.Trigger>

      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[80] bg-black/40" />
        <Drawer.Content
          className={cn(
            "fixed bottom-0 left-0 right-0 z-[81] rounded-t-2xl bg-background p-4 outline-none"
          )}
        >
          <div className="absolute -top-3 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-muted-foreground/50" />
          <div className="mb-3 flex items-center justify-between gap-3">
            <Drawer.Title className="text-sm font-semibold">{title}</Drawer.Title>

            <Drawer.Close asChild>
              <button
                type="button"
                aria-label="Close info sheet"
                className="rounded-md p-1 hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </Drawer.Close>
          </div>

          <Drawer.Description className="whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
            {description}
          </Drawer.Description>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
