"use client";

import { ArrowLeft, ArrowRight, Clock3, WalletCards } from "lucide-react";
import { useState } from "react";

import { Link } from "@/i18n/navigation";
import type { Blog } from "@/lib/blog/types";
import { formatBlogDate } from "@/lib/blog/utils";
import { cn } from "@/lib/utils";

export function FeaturedGuides({ guides }: { guides: Blog[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const guide = guides[activeIndex];

  if (!guide) {
    return (
      <div className="flex min-h-[265px] items-center justify-center rounded-2xl border border-dashed bg-muted/30 text-sm text-muted-foreground">
        Featured guides will appear here.
      </div>
    );
  }

  const showNavigation = guides.length > 1;
  const move = (direction: -1 | 1) => {
    setActiveIndex((current) => (current + direction + guides.length) % guides.length);
  };

  return (
    <article className="group relative min-h-[360px] overflow-hidden rounded-[1.5rem] border border-white/15 bg-slate-900 shadow-card md:min-h-[450px]">
      {guide.cover_image ? (
        <img
          key={guide.id}
          src={guide.cover_image}
          alt={guide.cover_alt || guide.title}
          className="absolute inset-0 h-full w-full animate-fade-in object-cover transition duration-700 group-hover:scale-[1.025]"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/70 via-slate-800 to-slate-950">
          <WalletCards className="h-24 w-24 text-white/25" />
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/55 to-slate-950/5" />
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/35 via-transparent to-transparent" />

      <div key={`${guide.id}-content`} className="absolute inset-x-0 bottom-0 animate-fade-in p-5 text-white sm:p-7 md:p-9">
        <div className="max-w-[78%] sm:max-w-[74%]">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-white/80">
            <span className="rounded bg-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
              {guide.is_featured ? "Featured guide" : "Latest guide"}
            </span>
            <span>{guide.category}</span>
            {showNavigation ? <span className="tabular-nums">· {activeIndex + 1} of {guides.length}</span> : null}
          </div>

          <Link href={`/blog/${guide.slug}`} className="block w-fit">
            <h2 className="line-clamp-2 font-serif text-2xl font-bold leading-tight text-white drop-shadow-sm sm:text-3xl md:text-[2.15rem]">
              {guide.title}
            </h2>
          </Link>

          <p className="mt-2 line-clamp-2 max-w-2xl text-xs leading-5 text-white/75 sm:text-sm sm:leading-6">
            {guide.excerpt}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-white/75">
            <Clock3 className="h-3.5 w-3.5" />
            <span>{guide.reading_time} min read</span>
            <span aria-hidden="true">·</span>
            <span>{formatBlogDate(guide.published_at)}</span>
            <Link href={`/blog/${guide.slug}`} className="ml-1 inline-flex items-center gap-1 font-bold text-white transition hover:text-primary-foreground/80">
              Read guide <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {showNavigation ? (
          <div className="mt-5 flex items-end justify-between gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-1.5" aria-label="Featured guide navigation">
              {guides.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={cn(
                    "h-1.5 max-w-10 flex-1 rounded-full transition-all",
                    index === activeIndex ? "bg-white" : "bg-white/30 hover:bg-white/60"
                  )}
                  aria-label={`Show featured guide ${index + 1}: ${item.title}`}
                  aria-current={index === activeIndex ? "true" : undefined}
                />
              ))}
            </div>
            <div className="flex shrink-0 gap-2">
              <button type="button" onClick={() => move(-1)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/90 text-slate-900 shadow-sm transition hover:bg-white" aria-label="Previous featured guide">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <button type="button" onClick={() => move(1)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/90 text-slate-900 shadow-sm transition hover:bg-white" aria-label="Next featured guide">
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}
