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
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

type FaqItem = {
  question: string;
  answer: string;
  icon: LucideIcon;
};

const faqs: FaqItem[] = [
  {
    question: `What is ${APP_NAME}?`,
    answer: `${APP_NAME} is a shared expense management platform that helps groups track expenses, split bills fairly, manage balances, and settle payments easily.`,
    icon: Info,
  },
  {
    question: `Does ${APP_NAME} support different currencies?`,
    answer: `Yes. Multi-currency support makes ${APP_NAME} useful for international travel expenses and shared payments across different currencies.`,
    icon: Globe,
  },
  {
    question: `Do I need to create an account to use ${APP_NAME}?`,
    answer: `No. You can create a group and start tracking shared expenses instantly without requiring everyone to sign up.`,
    icon: User,
  },
  {
    question: "Can I upload receipts or attachments?",
    answer:
      "Yes. You can attach receipts, invoices, and payment screenshots to keep every expense organized and easy to verify.",
    icon: FileText,
  },
  {
    question: `How can I split expenses in ${APP_NAME}?`,
    answer:
      "You can split bills equally, by percentage, or with custom amounts depending on how your group wants to share expenses.",
    icon: PieChart,
  },
  {
    question: "Can multiple people pay for the same expense?",
    answer: `Yes. ${APP_NAME} supports multiple payers for a single expense, making it easier to manage shared bookings, travel costs, and group payments.`,
    icon: Users,
  },
  {
    question: `Can I track travel expenses with ${APP_NAME}?`,
    answer: `Absolutely. ${APP_NAME} is designed for trips, vacations, and travel groups to help organize transport, hotel bookings, food expenses, and shared costs.`,
    icon: Luggage,
  },
  {
    question: "Can I export expense reports?",
    answer: `Yes. ${APP_NAME} allows you to download expense reports and balance summaries for records, reimbursements, or planning purposes.`,
    icon: Download,
  },
  {
    question: `Is ${APP_NAME} mobile friendly?`,
    answer: `Yes. ${APP_NAME} is optimized for mobile devices, making it easy to track shared expenses and group payments on the go.`,
    icon: Smartphone,
  },
  {
    question: `Who can use ${APP_NAME}?`,
    answer: `${APP_NAME} works well for roommates, couples, travel groups, friends, teams, events, and anyone managing shared expenses together.`,
    icon: Users,
  },
];

function FaqCard({ faq, index }: { faq: FaqItem; index: number }) {
  const Icon = faq.icon;

  return (
    <AccordionItem
      value={`faq-${index}`}
      className="overflow-hidden rounded-2xl border border-b-0 border-border/80 bg-card shadow-sm transition-shadow data-[state=open]:shadow-md dark:border-border/60"
    >
      <div className="p-5 sm:p-6">
        <div className="flex gap-4">
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-950/50"
            aria-hidden
          >
            <Icon className="h-7 w-7 text-violet-600 dark:text-violet-400" strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <AccordionTrigger
              className={cn(
                "gap-3 py-0 text-left text-[15px] font-bold leading-snug text-foreground hover:no-underline sm:text-base",
                "[&>svg]:h-4 [&>svg]:w-4 [&>svg]:shrink-0 [&>svg]:text-violet-600 dark:[&>svg]:text-violet-400"
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
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <section
      className="bg-background py-12 sm:py-16 md:py-20"
      aria-labelledby="faq-heading"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className="container">
        <header className="mx-auto mb-10 max-w-3xl text-center sm:mb-12 md:mb-14">
          <p className="mb-5 inline-flex items-center justify-center gap-2 rounded-full bg-violet-100 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
            <CircleHelp className="h-3.5 w-3.5" aria-hidden />
            FAQs
          </p>
          <h2
            id="faq-heading"
            className="text-balance text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-[2.75rem] md:leading-tight"
          >
            Frequently Asked Questions About{" "}
            <span className="text-violet-600">{APP_NAME}</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-sm text-muted-foreground sm:text-base">
            Everything you need to know about shared expense tracking, bill splitting, group
            payments, and managing expenses with {APP_NAME}.
          </p>
        </header>

        <Accordion
          type="multiple"
          defaultValue={faqs.map((_, index) => `faq-${index}`)}
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
