import { BlogCardSkeletons } from "@/components/blog/BlogSkeletons";
import { Layout } from "@/components/layout/Layout";
import { Skeleton } from "@/components/ui/skeleton";

export default function BlogLoading() {
  return (
    <Layout>
      <section className="py-10 md:py-14">
        <div className="container space-y-8">
          <div className="space-y-3">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-10 w-full max-w-2xl" />
            <Skeleton className="h-5 w-full max-w-xl" />
          </div>
          <Skeleton className="h-16 w-full rounded-lg" />
          <BlogCardSkeletons />
        </div>
      </section>
    </Layout>
  );
}
