import { Layout } from "@/components/layout/Layout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { APP_NAME } from "@/lib/constants";

const faqs = [
  {
    question: "What is Splitcost and how does it help split expenses?",
    answer: `${APP_NAME} is a free expense splitting app for friends, roommates, couples, and travel groups. Create a shared group, add bills, choose who paid, and ${APP_NAME} automatically calculates balances and the simplest way to settle up.`,
  },
  {
    question: "Do I need to create an account to use Splitcost?",
    answer: `No. ${APP_NAME} works without sign-up. You can create a group, share the link, and start tracking shared expenses right away.`,
  },
  {
    question: "How does the expense split calculator work?",
    answer: `${APP_NAME} lets you choose who paid and who joined each expense. You can split the amount equally, by percentage, or with custom shares, and the app updates each person's balance automatically.`,
  },
  {
    question: "Can I use Splitcost for trips, vacations, or roommate bills?",
    answer: `Yes. ${APP_NAME} works well for travel expenses, apartment costs, household bills, event planning, and any other shared spending where a group needs a simple expense tracker.`,
  },
  {
    question: "Can I track expenses in different currencies?",
    answer: "Yes. Each group has a default currency, and you can keep expenses organized for travel or international spending. This is especially useful when a trip includes payments in more than one currency.",
  },
  {
    question: "How do I share a group with friends or roommates?",
    answer: "Each group has a shareable link. Send that link to the people in your group so they can open the same expense tracker, add bills, and review balances together.",
  },
  {
    question: "Can I edit or delete an expense later?",
    answer: "Yes. Open an expense to update the amount, participants, split details, or payer. You can also delete expenses, and balances recalculate immediately.",
  },
  {
    question: "How does Splitcost calculate settlements?",
    answer: `${APP_NAME} reduces the number of payments needed to settle a group. Instead of everyone paying everyone else, the app simplifies balances into the fewest practical transactions.`,
  },
  {
    question: "Is my expense data secure?",
    answer: "Splitcost uses a mix of local storage and secure third-party infrastructure so shared groups can work across devices and sessions. We aim to collect only the information needed to run the product. See the Privacy Policy for full details.",
  },
  {
    question: "Is there a mobile app?",
    answer: `${APP_NAME} is a mobile-friendly web app that works well in your browser on phones, tablets, and desktops. You can also add it to your home screen for a more app-like experience.`,
  },
];

export default function FAQPage() {
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
    <Layout>
      <div className="container py-12 md:py-[3rem] max-w-3xl">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />

        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Expense Splitting FAQ
          </h1>
          <p className="text-lg text-muted-foreground">
            Answers about using {APP_NAME} to split bills, track shared
            expenses, and settle balances with friends, roommates, and travel
            groups.
          </p>
        </div>

        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="border border-border rounded-xl px-5 data-[state=open]:bg-muted/30"
            >
              <AccordionTrigger className="text-left font-semibold hover:no-underline py-5">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-5">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </Layout>
  );
}
