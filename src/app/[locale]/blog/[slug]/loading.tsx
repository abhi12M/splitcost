import { BlogDetailSkeleton } from "@/components/blog/BlogSkeletons";
import { Layout } from "@/components/layout/Layout";

export default function BlogDetailLoading() {
  return (
    <Layout>
      <BlogDetailSkeleton />
    </Layout>
  );
}
