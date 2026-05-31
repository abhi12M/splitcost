"use client";

import {
  PointerEvent as ReactPointerEvent,
  ReactNode,
  WheelEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ExpenseAttachment } from "@/lib/expenseAttachments";
import { cn } from "@/lib/utils";
import { useBackButtonClose } from "@/hooks/useBackButtonClose";

type ExpenseAttachmentViewerProps = {
  attachment: ExpenseAttachment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actions?: ReactNode;
};

export function ExpenseAttachmentViewer({
  attachment,
  open,
  onOpenChange,
  actions,
}: ExpenseAttachmentViewerProps) {
  const t = useTranslations("expense");
  const tCommon = useTranslations("common");
  const imageViewerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const clipRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    scale: number;
  } | null>(null);
  const pinchStateRef = useRef<{
    pointer1Id: number;
    pointer2Id: number;
    startDist: number;
    startScale: number;
    p1: { x: number; y: number };
    p2: { x: number; y: number };
  } | null>(null);
  const [imageScale, setImageScale] = useState(1);
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 });
  const dialogIconButtonClass =
    "inline-flex h-10 w-10 items-center justify-center rounded-full bg-transparent text-foreground/70 transition-colors [-webkit-tap-highlight-color:transparent] hover:bg-transparent hover:text-foreground active:bg-transparent focus:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 sm:hover:bg-muted";

  useBackButtonClose(open, () => onOpenChange(false));

  useEffect(() => {
    if (!open) {
      setImageScale(1);
      setImageOffset({ x: 0, y: 0 });
      dragStateRef.current = null;
      pinchStateRef.current = null;
    }
  }, [open, attachment?.url]);

  const clampScale = (value: number) => Math.min(4, Math.max(1, value));

  const clampOffset = useCallback((x: number, y: number, scale: number) => {
    const img = imageRef.current;
    const clip = clipRef.current;
    if (!img || !clip) return { x: 0, y: 0 };

    const maxX = Math.max(0, (img.offsetWidth * scale - clip.clientWidth) / 2);
    const maxY = Math.max(0, (img.offsetHeight * scale - clip.clientHeight) / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  }, []);

  const zoomImage = (delta: number) => {
    const next = clampScale(imageScale + delta);
    setImageScale(next);
    setImageOffset(clampOffset(imageOffset.x, imageOffset.y, next));
  };

  const handleImageWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (!attachment?.type.startsWith("image/")) return;
    event.preventDefault();
    zoomImage(event.deltaY < 0 ? 0.2 : -0.2);
  };

  const handleImagePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!attachment?.type.startsWith("image/")) return;
      event.preventDefault();

      const pinch = pinchStateRef.current;

      if (pinch && pinch.pointer1Id !== event.pointerId) {
        if (dragStateRef.current) {
          imageViewerRef.current?.releasePointerCapture(dragStateRef.current.pointerId);
          dragStateRef.current = null;
        }
        pinchStateRef.current = {
          ...pinch,
          pointer2Id: event.pointerId,
          p2: { x: event.clientX, y: event.clientY },
          startDist: Math.hypot(
            event.clientX - pinch.p1.x,
            event.clientY - pinch.p1.y
          ),
          startScale: imageScale,
        };
        imageViewerRef.current?.setPointerCapture(event.pointerId);
        return;
      }

      pinchStateRef.current = {
        pointer1Id: event.pointerId,
        pointer2Id: -1,
        startDist: 0,
        startScale: imageScale,
        p1: { x: event.clientX, y: event.clientY },
        p2: { x: 0, y: 0 },
      };

      if (imageScale > 1) {
        dragStateRef.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          originX: imageOffset.x,
          originY: imageOffset.y,
          scale: imageScale,
        };
        imageViewerRef.current?.setPointerCapture(event.pointerId);
      }
    },
    [attachment, imageScale, imageOffset.x, imageOffset.y]
  );

  const handleImagePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      const pinch = pinchStateRef.current;

      if (pinch && pinch.pointer2Id !== -1) {
        let p1 = pinch.p1;
        let p2 = pinch.p2;
        if (event.pointerId === pinch.pointer1Id) p1 = { x: event.clientX, y: event.clientY };
        if (event.pointerId === pinch.pointer2Id) p2 = { x: event.clientX, y: event.clientY };
        pinchStateRef.current = { ...pinch, p1, p2 };

        const currentDist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        if (pinch.startDist > 0) {
          const next = clampScale(pinch.startScale * (currentDist / pinch.startDist));
          setImageScale(next);
          setImageOffset((prev) => clampOffset(prev.x, prev.y, next));
        }
        return;
      }

      const dragState = dragStateRef.current;
      if (!dragState || dragState.pointerId !== event.pointerId) return;

      setImageOffset(
        clampOffset(
          dragState.originX + (event.clientX - dragState.startX),
          dragState.originY + (event.clientY - dragState.startY),
          dragState.scale
        )
      );
    },
    [clampOffset]
  );

  const handleImagePointerEnd = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const pinch = pinchStateRef.current;

    if (pinch && (event.pointerId === pinch.pointer1Id || event.pointerId === pinch.pointer2Id)) {
      imageViewerRef.current?.releasePointerCapture(event.pointerId);
      pinchStateRef.current = null;
      dragStateRef.current = null;
      return;
    }

    if (dragStateRef.current?.pointerId === event.pointerId) {
      imageViewerRef.current?.releasePointerCapture(event.pointerId);
      dragStateRef.current = null;
      pinchStateRef.current = null;
    }
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-dvh max-w-none gap-0 overflow-hidden rounded-none border-0 bg-background p-0 sm:h-[92dvh] sm:max-w-3xl sm:rounded-lg [&>button:last-child]:hidden">
        <DialogTitle className="sr-only">{t("attachedImageTitle")}</DialogTitle>
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-3 sm:px-4">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                aria-label={tCommon("back")}
                className={dialogIconButtonClass}
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold sm:text-base">
                  {t("attachedImageTitle")}
                </p>
              </div>
            </div>

            {actions && <div className="flex items-center gap-1">{actions}</div>}
          </div>

          {attachment && (
            <div className="min-h-0 flex-1 bg-background">
              {attachment.type.startsWith("image/") ? (
                <div
                  ref={imageViewerRef}
                  className={cn(
                    "flex h-full w-full items-center justify-center px-5 py-4 sm:px-6 sm:py-6",
                    imageScale > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-default"
                  )}
                  style={{ touchAction: "none" }}
                  onWheel={handleImageWheel}
                  onPointerDown={handleImagePointerDown}
                  onPointerMove={handleImagePointerMove}
                  onPointerUp={handleImagePointerEnd}
                  onPointerCancel={handleImagePointerEnd}
                >
                  <div
                    ref={clipRef}
                    className="flex min-h-0 flex-1 items-center justify-center overflow-hidden self-stretch rounded-sm"
                  >
                    <img
                      ref={imageRef}
                      src={attachment.url}
                      alt={attachment.name}
                      className="max-h-full max-w-full select-none object-contain"
                      draggable={false}
                      style={{
                        transform: `translate(${imageOffset.x}px, ${imageOffset.y}px) scale(${imageScale})`,
                        transformOrigin: "center center",
                        transition:
                          dragStateRef.current || pinchStateRef.current?.pointer2Id !== -1
                            ? "none"
                            : "transform 120ms ease-out",
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center p-6 text-center text-muted-foreground">
                  <p>{t("previewNotAvailable")}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
