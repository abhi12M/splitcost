import { Skeleton } from "@/components/ui/skeleton";

export function ExpenseFormMobileSkeleton() {
  return (
    <>
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-background z-50 flex items-center justify-between px-4 h-14 border-b">
        <Skeleton className="w-5 h-5 rounded" />
        <Skeleton className="w-24 h-4 rounded" />
        <Skeleton className="w-5 h-5 rounded" />
      </div>

      {/* Main Content */}
      <div
        className="fixed left-0 right-0 bg-background overflow-y-auto"
        style={{ top: 56, bottom: 56 }}
      >
        <div className="p-4 space-y-6">

          {/* Row 1 */}
          <div className="grid grid-cols-[auto_1fr] gap-2 px-5">
            <Skeleton className="w-12 h-10 rounded" />
            <Skeleton className="h-10 w-full rounded" />
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-[auto_1fr] gap-2 px-5">
            <Skeleton className="w-16 h-10 rounded" />
            <Skeleton className="h-10 w-full rounded" />
          </div>

          {/* Paid by */}
          <div className="flex justify-center gap-3 items-center mt-4">
            <Skeleton className="w-12 h-3 rounded" />
            <Skeleton className="w-40 h-10 rounded" />
          </div>

          {/* Split button */}
          <div className="flex justify-center mt-3">
            <Skeleton className="w-40 h-10 rounded" />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="fixed left-0 right-0 bottom-0 bg-background border-t h-14 px-4 flex items-center">
        <div className="flex items-center gap-2">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="w-24 h-4 rounded" />
        </div>
      </div>
    </>
  );
}
