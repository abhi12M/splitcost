"use client";

import { Minus, Plus } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { BlogFaqItem } from "@/lib/blog/faq";

type BlogFaqSectionProps = {
  title: string;
  description: string;
  intro?: string;
  headingId: string;
  items: BlogFaqItem[];
};

export function BlogFaqSection({
  title,
  description,
  intro,
  headingId,
  items,
}: BlogFaqSectionProps) {
  return (
    <section className="blog-faq-section" aria-labelledby={headingId}>
      <span className="blog-faq-blob blog-faq-blob-left" aria-hidden="true" />
      <span className="blog-faq-blob blog-faq-blob-right" aria-hidden="true" />
      <span className="blog-faq-orbit blog-faq-orbit-one" aria-hidden="true" />
      <span className="blog-faq-orbit blog-faq-orbit-two" aria-hidden="true" />

      <div className="blog-faq-inner">
        <header className="blog-faq-header">
          <p className="blog-faq-eyebrow">FAQ</p>
          <h2 id={headingId}>{title}</h2>
          {intro ? (
            <div className="blog-faq-description">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{intro}</ReactMarkdown>
            </div>
          ) : (
            <p className="blog-faq-description">{description}</p>
          )}
        </header>

        <Accordion type="single" collapsible defaultValue="faq-0" className="blog-faq-list">
          {items.map((item, index) => (
            <AccordionItem
              key={`${item.question}-${index}`}
              value={`faq-${index}`}
              className="blog-faq-item group"
            >
              <AccordionTrigger
                id={`section-${item.headingIndex}`}
                className="blog-faq-trigger hover:no-underline [&>svg]:hidden"
              >
                <span className="blog-faq-question">
                  <span aria-hidden="true">{index + 1}.</span>
                  <span>{item.question}</span>
                </span>
                <span className="blog-faq-toggle" aria-hidden="true">
                  <Plus className="group-data-[state=open]:hidden" />
                  <Minus className="hidden group-data-[state=open]:block" />
                </span>
              </AccordionTrigger>
              <AccordionContent className="blog-faq-answer">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.answer}</ReactMarkdown>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
