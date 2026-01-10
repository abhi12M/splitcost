import * as Tooltip from "@radix-ui/react-tooltip";
import * as Popover from "@radix-ui/react-popover";
import { useDeviceType } from "@/hooks/useDeviceType";

const overlayClass =
  "z-50 max-w-xs rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md whitespace-pre-line";

export function AvatarNameOverlay({
  name,
  children,
}: {
  name: string;
  children: React.ReactNode;
}) {
  const device = useDeviceType();
  const isMobile = device !== "desktop";

  if (isMobile) {
    return (
      <Popover.Root>
        <Popover.Trigger asChild>{children}</Popover.Trigger>
        <Popover.Portal>
          <Popover.Content className={overlayClass} sideOffset={6}>
            {name}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
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
