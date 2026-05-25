"use client";

import {
  CircleHelp,
  Download,
  FileText,
  Globe,
  Info,
  Luggage,
  PieChart,
  Smartphone,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { brandStyles, landingSection } from "@/lib/brand-styles";
import { APP_NAME } from "@/lib/constants";
import { FAQ_ITEMS } from "@/lib/faq";
import { cn } from "@/lib/utils";

type FaqDisplayItem = {
  question: string;
  answer: string;
  icon: LucideIcon;
};

const faqs: FaqDisplayItem[] = [
  { ...FAQ_ITEMS[0], icon: Info },
  { ...FAQ_ITEMS[1], icon: Globe },
  { ...FAQ_ITEMS[2], icon: User },
  { ...FAQ_ITEMS[3], icon: FileText },
  { ...FAQ_ITEMS[4], icon: PieChart },
  { ...FAQ_ITEMS[5], icon: Users },
  { ...FAQ_ITEMS[6], icon: Luggage },
  { ...FAQ_ITEMS[7], icon: Download },
  { ...FAQ_ITEMS[8], icon: Smartphone },
  { ...FAQ_ITEMS[9], icon: Users },
];

function FaqCard({ faq, index }: { faq: FaqDisplayItem; index: number }) {
  const Icon = faq.icon;

  return (
    <AccordionItem
      value={`faq-${index}`}
      className="group overflow-hidden rounded-2xl border border-b-0 border-border/80 bg-card shadow-sm transition-shadow data-[state=open]:shadow-md dark:border-border/60"
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-center gap-4 group-data-[state=open]:items-start">
          <span
            className={cn(
              "flex h-14 w-14 shrink-0 items-center justify-center rounded-full",
              brandStyles.iconCircle
            )}
            aria-hidden
          >
            <Icon className={cn("h-7 w-7", brandStyles.icon)} strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <AccordionTrigger
              className={cn(
                "w-full gap-3 py-0 text-left text-[15px] font-bold leading-snug text-foreground hover:no-underline sm:text-base",
                "[&>svg]:h-4 [&>svg]:w-4 [&>svg]:shrink-0 [&>svg]:self-center [&>svg]:text-primary dark:[&>svg]:text-primary/90"
              )}
            >
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="pb-0 pt-3 text-sm leading-relaxed text-muted-foreground">
              {faq.answer}
            </AccordionContent>
          </div>
        </div>
      </div>
    </AccordionItem>
  );
}

export function FaqSection() {
  return (
    <section
      id="faq"
      className={cn(landingSection.default, landingSection.padding)}
      aria-labelledby="faq-heading"
    >
      <div className="container">
        <header className="mx-auto mb-8 max-w-3xl text-center sm:mb-12 md:mb-14">
          <p className={cn("mb-5", brandStyles.sectionBadge)}>
            <CircleHelp className="h-3.5 w-3.5" aria-hidden />
            FAQs
          </p>
          <h2
            className="text-balance text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-[2.75rem] md:leading-tight"
          >
            Frequently Asked Questions About{" "}
            <span className={brandStyles.headingAccent}>{APP_NAME}</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-sm text-muted-foreground sm:text-base">
            Everything you need to know about shared expense tracking, bill splitting, group
            payments, and managing expenses with {APP_NAME}.
          </p>
        </header>

        <Accordion
          type="multiple"
          defaultValue={[]}
          className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2"
        >
          {faqs.map((faq, index) => (
            <FaqCard key={faq.question} faq={faq} index={index} />
          ))}
        </Accordion>
      </div>
    </section>
  );
}
