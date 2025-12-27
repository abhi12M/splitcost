import { getAvatarColor, getInitials } from "@/lib/avatar-utils";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  sm: "w-7 h-7 text-xs",
  md: "w-9 h-9 text-sm",
  lg: "w-11 h-11 text-base",
  xl: "w-14 h-14 text-lg",
};

export function UserAvatar({ name, size = "md", className }: UserAvatarProps) {
  const colors = getAvatarColor(name);
  const initials = getInitials(name);

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-semibold select-none ring-2 ring-background",
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
}

export function AvatarGroup({ names, max = 4, size = "md", className }: AvatarGroupProps) {
  const visibleNames = names.slice(0, max);
  const overflow = names.length - max;

  return (
    <div className={cn("flex -space-x-2", className)}>
      {visibleNames.map((name, index) => (
        <UserAvatar
          key={`${name}-${index}`}
          name={name}
          size={size}
          className="border-2 border-background"
        />
      ))}
      {overflow > 0 && (
        <div
          className={cn(
            "rounded-full flex items-center justify-center font-semibold bg-muted text-muted-foreground ring-2 ring-background",
            sizeClasses[size]
          )}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
