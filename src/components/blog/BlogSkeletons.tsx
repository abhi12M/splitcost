import { Skeleton } from "@/components/ui/skeleton";

export function BlogDetailSkeleton() {
  return (
    <article className="blog-detail-page bg-background text-foreground">
      <section className="blog-hero relative border-b border-border bg-muted/40">
        <div className="container relative min-h-[515px] py-6 md:py-10 lg:py-7">
          <div className="blog-hero-image absolute inset-0 hidden overflow-hidden lg:block">
            <Skeleton className="h-full w-full rounded-none" />
          </div>
          <div className="relative z-10 flex min-h-[467px] max-w-[650px] flex-col justify-center rounded-2xl bg-white px-6 py-8 shadow-[0_18px_50px_rgba(45,37,25,0.08)] sm:px-10 lg:px-12">
            <Skeleton className="mb-7 h-4 w-48" />
            <Skeleton className="mb-5 h-6 w-24 rounded-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="mt-3 h-12 w-4/5" />
            <Skeleton className="mt-5 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-3/4" />
            <Skeleton className="mt-6 h-4 w-56" />
          </div>
          <div className="relative z-10 mt-5 aspect-[16/9] overflow-hidden rounded-xl lg:hidden">
            <Skeleton className="h-full w-full rounded-xl" />
          </div>
        </div>
      </section>

      <section className="pb-8 pt-8 md:pb-10 md:pt-12">
        <div className="container max-w-[1180px]">
          <div className="grid gap-10 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-14">
            <aside className="blog-outline lg:top-[6rem] lg:self-start lg:pr-1">
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
              <Skeleton className="h-12 w-full rounded-lg lg:hidden" />
            </aside>

            <div className="max-w-[800px] space-y-4">
              <Skeleton className="h-8 w-2/3" />
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-4 w-full" />
              ))}
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="my-7 aspect-[16/9] w-full rounded-xl" />
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={`p-${index}`} className="h-4 w-full" />
              ))}
            </div>
          </div>
        </div>
      </section>
    </article>
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
