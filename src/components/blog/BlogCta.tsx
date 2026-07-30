import { ArrowRight, ReceiptText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export function BlogCta() {
  return (
    <section className="bg-background pb-8" aria-labelledby="blog-cta-title">
      <div className="container max-w-[1180px]">
        <div className="overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-r from-primary/5 via-card to-primary/5 px-5 py-5 shadow-sm sm:px-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ReceiptText className="h-5 w-5" aria-hidden="true" />
            </span>

            <div className="min-w-0 flex-1">
              <h2
                id="blog-cta-title"
                className="text-lg font-bold leading-snug text-foreground sm:text-xl"
              >
                Make your next shared expense easier
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Create a group, add expenses, and let SplitCost work out who owes what.
              </p>
            </div>

            <Button asChild className="w-full shrink-0 sm:w-auto">
              <Link href="/create-group">
                Start splitting for free
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
