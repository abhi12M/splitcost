import { cn } from "@/lib/utils";
import { getAvatarColor, getInitials } from "@/lib/avatar-utils";
import { SingleSelect } from "./single-select";

type AvatarSize = "sm" | "md" | "lg" | "xl";

const sizeClasses: Record<AvatarSize, string> = {
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
        "flex items-center justify-center rounded-full font-semibold select-none",
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
}

export function AvatarGroup({
  names,
  max = 4,
  size = "md",
  className,
  showBelow = false,
}: AvatarGroupProps) {
  const visibleNames = names.slice(0, max);
  const overflow = names.length - max;
  const overflowNames = names.slice(max);

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
      <span
        className={cn(
          "text-sm text-muted-foreground",
          showBelow ? "mt-1" : "ml-2"
        )}
      >
        {names.length} members
      </span>
    </div>
  );
}
