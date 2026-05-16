import { Skeleton } from "@/components/ui/skeleton";

function ExpenseRowSkeleton() {
  return (
    <div className="flex gap-3 border-t border-border/60 px-3 py-3">
      <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-[68%] max-w-[12rem]" />
        <Skeleton className="h-3 w-[42%] max-w-[8rem]" />
        <div className="flex gap-1 pt-0.5">
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-6 w-6 rounded-full" />
        </div>
      </div>
      <Skeleton className="h-4 w-14 shrink-0 self-start" />
    </div>
  );
}

function ExpenseGroupSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="mb-1 overflow-hidden rounded-xl border border-border/80">
      <div className="flex items-center justify-between gap-2 bg-muted/30 px-3 py-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Skeleton className="h-4 w-4 shrink-0 rounded-sm" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-4 w-28 max-w-full" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <Skeleton className="h-4 w-12 shrink-0" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <ExpenseRowSkeleton key={i} />
      ))}
    </div>
  );
}

/** Loading placeholder matching {@link MobileGroupDashboard} layout. */
export function MobileGroupDashboardSkeleton() {
  return (
    <div
      className="flex min-h-[100dvh] flex-col bg-background"
      aria-busy="true"
      aria-label="Loading group dashboard"
    >
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/90">
        <div className="flex h-14 items-center gap-2 px-3 sm:px-4">
          <Skeleton className="h-9 w-9 shrink-0 rounded-md" />
          <Skeleton className="h-5 min-w-0 flex-1 max-w-[10rem]" />
          <Skeleton className="h-9 w-9 shrink-0 rounded-md" />
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-border/60 px-4 py-3">
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-24" />
          </div>
          <div className="space-y-1.5 text-right">
            <Skeleton className="ml-auto h-3 w-16" />
            <Skeleton className="ml-auto h-6 w-20" />
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col px-3 pb-32 pt-3 sm:px-4">
        <div className="mb-3 flex items-center gap-2">
          <Skeleton className="h-10 min-w-0 flex-1 rounded-xl" />
          <Skeleton className="h-10 w-[4.75rem] shrink-0 rounded-xl" />
          <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
        </div>

        <div className="mb-3 flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {["4.75rem", "5.25rem", "4.5rem", "5rem", "4.75rem", "5.5rem", "4.25rem"].map((w, i) => (
            <Skeleton key={i} className="h-8 shrink-0 rounded-full" style={{ width: w }} />
          ))}
        </div>

        <ExpenseGroupSkeleton rows={3} />
        <ExpenseGroupSkeleton rows={2} />
      </div>

      <Skeleton
        className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+5.25rem)] right-[max(1.25rem,env(safe-area-inset-right,0px))] z-40 h-14 w-14 rounded-full"
        aria-hidden
      />

      <div
        className="pointer-events-none fixed bottom-[max(1rem,env(safe-area-inset-bottom,0px))] left-1/2 z-40 -translate-x-1/2"
        aria-hidden
      >
        <Skeleton className="h-10 w-[12.5rem] rounded-full shadow-lg" />
      </div>
    </div>
  );
}
