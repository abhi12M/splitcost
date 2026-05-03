import * as Tooltip from "@radix-ui/react-tooltip";
import { useDeviceType } from "@/hooks/useDeviceType";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const overlayClass =
  "z-50 max-w-xs rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md whitespace-pre-line";

export function AvatarNameOverlay({
  name,
  children,
  disableMobileOverlay = false,
}: {
  name: string;
  children: React.ReactNode;
  disableMobileOverlay?: boolean;
}) {
  const device = useDeviceType();
  const isMobile = device !== "desktop";

  if (isMobile) {
    if (disableMobileOverlay) return <>{children}</>;

    return (
      <Popover>
        <PopoverTrigger asChild>{children}</PopoverTrigger>
        <PopoverContent className={overlayClass} sideOffset={6}>
          {name}
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Tooltip.Provider delayDuration={150}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content className={overlayClass} sideOffset={6}>
            {name}
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
