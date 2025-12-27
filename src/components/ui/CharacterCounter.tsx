import { cn } from "@/lib/utils";

interface CharacterCounterProps {
    current: number;
    max: number;
    className?: string;
}

export function CharacterCounter({ current, max, className }: CharacterCounterProps) {
    const percentage = (current / max) * 100;
    const isWarning = percentage >= 80 && percentage < 100;
    const isError = percentage >= 100;

    return (
        <span
            className={cn(
                "text-xs tabular-nums transition-colors",
                isError
                    ? "text-destructive font-medium"
                    : isWarning
                        ? "text-warning"
                        : "text-muted-foreground",
                className
            )}
        >
            {current}/{max}
        </span>
    );
}
