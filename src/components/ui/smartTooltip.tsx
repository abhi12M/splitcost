"use client";

import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { useDeviceType } from "@/hooks/useDeviceType";

interface SmartTooltipProps {
    text: string;
    maxWidth?: string;
    className?: string;
    disableMobileTooltip?: boolean;
}

export function SmartTooltip({
    text,
    className = "",
    disableMobileTooltip = false,
}: SmartTooltipProps) {

    const device = useDeviceType();
    if (!text) return null;

    // 📱 MOBILE → Popover (tap)
    if (device != 'desktop') {
        if (disableMobileTooltip) {
            return (
                <span className={`truncate block w-fit max-w-full ${className}`}>
                    {text}
                </span>
            );
        }

        return (
            <Popover>
                <PopoverTrigger asChild>
                    <span
                        className={`truncate block w-fit max-w-full cursor-pointer ${className}`}
                    >
                        {text}
                    </span>
                </PopoverTrigger>

                <PopoverContent className="max-w-[240px] max-h-[160px] text-xs p-2 break-all overflow-y-auto">
                    {text}
                </PopoverContent>
            </Popover>
        );
    }

    // 🖥 DESKTOP → Tooltip (hover)
    return (
        <TooltipProvider delayDuration={0}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <span
                        className={`truncate block w-fit max-w-full cursor-pointer ${className}`}
                    >
                        {text}
                    </span>
                </TooltipTrigger>

                <TooltipContent className="max-w-[240px] max-h-[160px] overflow-y-auto text-xs p-2 break-all">{text}</TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
