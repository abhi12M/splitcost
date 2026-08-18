import { Skeleton } from "@/components/ui/skeleton";

export function BlogDetailSkeleton() {
  return (
    <div className="blog-detail-page bg-background text-foreground">
      <section className="border-b bg-muted/30 px-6 py-8 md:px-10 md:py-12">
        <div className="mx-auto max-w-4xl space-y-5">
          <Skeleton className="h-3 w-36" />
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-10 w-full md:h-14" />
            <Skeleton className="h-10 w-3/4 md:h-14" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-4/5" />
          </div>
        </div>
      </section>

      <section className="px-6 pb-10 pt-8 md:px-10">
        <div className="relative mx-auto aspect-[16/8] max-w-5xl overflow-hidden rounded-lg bg-muted">
          <Skeleton className="h-full w-full rounded-lg" />
        </div>
      </section>

      <section className="pb-8 md:pb-10">
        <div className="container max-w-[1180px]">
          <div className="grid gap-10 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-14">
            <aside className="blog-outline hidden lg:block lg:top-[6rem] lg:self-start lg:pr-1">
              <div className="hidden border-r border-border pr-6 lg:block">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-3 h-px w-10" />
                <div className="mt-3 space-y-2.5">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            </aside>

            <div className="w-full max-w-[800px] space-y-4">
              <Skeleton className="h-9 w-2/3" />
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-5 w-full" />
              ))}
              <Skeleton className="h-5 w-5/6" />
              <Skeleton className="my-8 aspect-[16/9] w-full rounded-xl" />
              <Skeleton className="h-8 w-3/5" />
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={`p-${index}`} className="h-5 w-full" />
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export function BlogCardSkeletons() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-lg border bg-card">
          <Skeleton className="aspect-[16/9] w-full rounded-none" />
          <div className="space-y-3 p-5">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
