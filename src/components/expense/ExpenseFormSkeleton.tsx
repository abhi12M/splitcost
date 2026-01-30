import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export function ExpenseFormSkeleton() {
  return (
    <>
      <div className=" block md:hidden">
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
      </div>
      <div className="container py-6 md:py-8 max-w-2xl hidden md:block">
        {/* Back button */}
        <Skeleton className="h-8 w-32 mb-4 rounded-md" />

        <Card>
          <CardHeader className="pb-4 space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-3/4" />
          </CardHeader>

          <CardContent>
            <FormSkeleton />
          </CardContent>
        </Card>
      </div>
    </>
  );

}

function FormSkeleton() {
  return (
    <div className="space-y-6">
      {/* TOP GRID */}
      <div className="grid grid-cols-12 gap-4">
        {/* LEFT – DESCRIPTION */}
        <div className="col-span-12 sm:col-span-6 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>

        {/* RIGHT – CATEGORY / AMOUNT / PAID BY */}
        <div className="col-span-12 sm:col-span-6 space-y-4">
          {/* Category */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-14 w-full rounded-xl" />
          </div>

          {/* Paid By */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
        </div>
      </div>

      {/* SPLIT TYPE */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-44" />
        <div className="flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-11 flex-1 rounded-xl" />
          ))}
        </div>
      </div>

      {/* VALIDATION BAR */}
      <div className="space-y-2">
        <div className="flex justify-between">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </div>

      {/* PARTICIPANTS */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />

        <div className="space-y-2 max-h-[290px] overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 rounded-xl border"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>

              <Skeleton className="h-8 w-20 rounded-md" />
            </div>
          ))}
        </div>
      </div>

      {/* SUBMIT */}
      <div className="pt-3 border-t">
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </div>
  )
}
