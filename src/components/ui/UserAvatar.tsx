import { cn } from "@/lib/utils";
import { getAvatarColor, getInitials } from "@/lib/avatar-utils";
import { SingleSelect } from "./single-select";
import { useDeviceType } from "@/hooks/useDeviceType";
import { AvatarNameOverlay } from "./AvatarNameOverlay";

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

const sizeClasses: Record<AvatarSize, string> = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-7 h-7 text-xs",
  md: "w-9 h-9 text-sm",
  lg: "w-11 h-11 text-base",
  xl: "w-14 h-14 text-lg",
};

const defaultAvatarSize: AvatarSize = "md";

/* -----------------------------------------
   Shared responsive size resolver
------------------------------------------ */
function getResponsiveAvatarSize(
  device: "mobile" | "tablet" | "desktop",
): AvatarSize {
  if (device === "mobile") return "sm";
  if (device === "tablet") return "md";
  return "sm";
}

/* -----------------------------------------
   UserAvatar
------------------------------------------ */
interface UserAvatarProps {
  name: string;
  size?: AvatarSize;
  className?: string;
}

export function UserAvatar({
  name,
  size ,
  className,
}: UserAvatarProps) {
  const device = useDeviceType();
  const effectiveSize = size || getResponsiveAvatarSize(device);

  const colors = getAvatarColor(name);
  const initials = getInitials(name);

  const avatar = (
    <div
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "flex items-center justify-center rounded-full font-semibold select-none flex-shrink-0 cursor-pointer active:scale-95 transition",
        sizeClasses[effectiveSize],
        className
      )}
      style={{
        backgroundColor: `hsl(${colors.bg})`,
        color: `hsl(${colors.fg})`,
      }}
      aria-label={name}
    >
      {initials}
    </div>
  );

  return <AvatarNameOverlay name={name}>{avatar}</AvatarNameOverlay>;
}

/* -----------------------------------------
   AvatarGroup
------------------------------------------ */
interface AvatarGroupProps {
  names: string[];
  max?: number;
  size?: AvatarSize;
  className?: string;
  showBelow?: boolean;
  label?: string;
}

export function AvatarGroup({
  names,
  max = 4,
  size = defaultAvatarSize,
  className,
  showBelow,
  label = "members",
}: AvatarGroupProps) {
  const device = useDeviceType();

  const effectiveSize = getResponsiveAvatarSize(device);
  const effectiveMax = device === "mobile" ? 4 : max;

  const resolvedShowBelow =
    showBelow !== undefined ? showBelow : device === "mobile";

  const visibleNames = names.slice(0, effectiveMax);
  const overflow = names.length - effectiveMax;
  const overflowNames = names.slice(effectiveMax);

  return (
    <div
      className={cn(
        "flex items-center",
        resolvedShowBelow && "flex-col items-start",
        className
      )}
    >
      {/* Avatars */}
      <div className="flex items-center -space-x-1.5">
        {visibleNames.map((name, index) => (
          <UserAvatar
            key={`${name}-${index}`}
            name={name}
            size={effectiveSize}
            className="border-[1.5px] border-white"
          />
        ))}

        {overflow > 0 && (
          <SingleSelect
            items={overflowNames.map((m) => ({
              id: m,
              label: m,
              showAvatar: true,
            }))}
            isMinWidth
            trigger={
              <button
                type="button"
                className={cn(
                  "flex items-center justify-center rounded-full font-semibold bg-muted text-muted-foreground border-[1.5px] border-white hover:bg-muted/80 transition",
                  sizeClasses[effectiveSize]
                )}
                aria-label={`View ${overflow} more members`}
                onClick={(e) => e.stopPropagation()}
              >
                +{overflow}
              </button>
            }
          />
        )}
      </div>

      {/* Member count */}
      {label && names.length > 5 && (
        <span
          className={cn(
            "text-xs text-muted-foreground",
            resolvedShowBelow ? "mt-1" : "ml-1"
          )}
        >
          {names.length} {label}
        </span>
      )}
    </div>
  );
}
