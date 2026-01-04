import { cn } from "@/lib/utils";
import { getAvatarColor, getInitials } from "@/lib/avatar-utils";
import { SingleSelect } from "./single-select";
import { useIsMobile } from "@/hooks/use-mobile";

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

const sizeClasses: Record<AvatarSize, string> = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-7 h-7 text-xs",
  md: "w-9 h-9 text-sm",
  lg: "w-11 h-11 text-base",
  xl: "w-14 h-14 text-lg",
};
interface UserAvatarProps {
  name: string;
  size?: AvatarSize;
  className?: string;
}

export function UserAvatar({
  name,
  size = "md",
  className,
}: UserAvatarProps) {
  const colors = getAvatarColor(name);
  const initials = getInitials(name);

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full font-semibold select-none flex-shrink-0",
        sizeClasses[size],
        className
      )}
      style={{
        backgroundColor: `hsl(${colors.bg})`,
        color: `hsl(${colors.fg})`,
      }}
      aria-label={name}
      title={name}
    >
      {initials}
    </div>
  );
}

interface AvatarGroupProps {
  names: string[];
  max?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
  showBelow?: boolean;
  label?: string;
}

export function AvatarGroup({
  names,
  max = 4,
  size = "md",
  className,
  showBelow = false,
  label = 'members'
}: AvatarGroupProps) {
  const isMobile = useIsMobile();
  const effectiveMax = isMobile ? 2 : max;
  const visibleNames = names.slice(0, effectiveMax);
  const overflow = names.length - effectiveMax;
  const overflowNames = names.slice(effectiveMax);

  return (
    <div
      className={cn(
        "flex items-center",
        showBelow && "flex-col items-start",
        className
      )}
    >
      {/* Avatars */}
      <div className="flex items-center -space-x-3">
        {visibleNames.map((name, index) => (
          <UserAvatar
            key={`${name}-${index}`}
            name={name}
            size={size}
            className="border-[3px] border-white"
          />
        ))}

        {overflow > 0 && (
          <SingleSelect
            items={overflowNames.map((m) => ({
              id: m,
              label: m,
              icon: <UserAvatar name={m} size="md" />,
            }))}
            onlyList
            trigger={
              <button
                type="button"
                className={cn(
                  "flex items-center justify-center rounded-full font-semibold bg-muted text-muted-foreground border-[3px] border-white hover:bg-muted/80 transition",
                  sizeClasses[size]
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
            showBelow ? "mt-1" : "ml-1"
          )}
        >
          {names.length} {label}
        </span>
      )}
    </div>
  );
}
