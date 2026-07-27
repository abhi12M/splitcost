import { Skeleton } from "@/components/ui/skeleton";
import { Layout } from "@/components/layout/Layout";

export default function Loading() {
  return (
    <Layout>
      <div className="container space-y-8 py-12">
        <Skeleton className="h-12 w-2/3 max-w-xl" />
        <Skeleton className="h-6 w-full max-w-2xl" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-80 rounded-2xl" />
          ))}
        </div>
      </div>
    </Layout>
  );
}
