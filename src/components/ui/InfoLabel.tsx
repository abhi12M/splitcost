import * as React from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { Info, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { DesktopTooltip } from "./DesktopTooltip"

interface InfoLabelProps {
    label: string
    info: string
    className?: string
}

export function InfoLabel({ label, info, className }: InfoLabelProps) {
    return (
        <>
            {/* Desktop */}
            <span className={cn("hidden sm:inline-flex items-center gap-1", className)}>
                <span>{label}</span>
                <DesktopTooltip content={info} />
            </span>

            {/* Mobile */}
            <Dialog.Root>
                <Dialog.Trigger asChild>
                    <button
                        type="button"
                        className={cn(
                            "inline-flex sm:hidden items-center underline decoration-dotted underline-offset-4",
                            className
                        )}
                    >
                        {label}
                    </button>
                </Dialog.Trigger>

                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50 animate-in fade-in" />

                    <Dialog.Content
                        className={cn(
                            "fixed bottom-0 left-0 right-0 z-50",
                            "rounded-t-2xl bg-background p-4",
                            "animate-in slide-in-from-bottom duration-200"
                        )}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <Dialog.Title className="text-sm font-semibold">
                                {label}
                            </Dialog.Title>

                            <Dialog.Close asChild>
                                <button className="p-1 rounded-md hover:bg-muted">
                                    <X className="w-4 h-4" />
                                </button>
                            </Dialog.Close>
                        </div>
                        <Dialog.Description className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                            {info}
                        </Dialog.Description>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </>
    )
}
