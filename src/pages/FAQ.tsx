import { Layout } from "@/components/layout/Layout";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { APP_NAME } from "@/lib/constants";

const faqs = [
  {
    question: "Do I need to create an account?",
    answer: `No! ${APP_NAME} doesn't require any sign-up. Simply create a group, share the link, and start adding expenses. Your data is stored locally and synced via the shareable link.`,
  },
  {
    question: "How does expense splitting work?",
    answer: `When you add an expense, you select who paid and who participated. ${APP_NAME} automatically calculates how much each person owes. You can split equally among participants or customize amounts.`,
  },
  {
    question: "Can I track expenses in different currencies?",
    answer: "Yes! Each expense can have its own currency. This is perfect for trips abroad where you might pay in multiple currencies. The group's default currency is used for balance calculations.",
  },
  {
    question: "How do I share a group with friends?",
    answer: "Each group has a unique shareable link. Click the 'Share' button on the group page to copy the link. Anyone with the link can view and add expenses to the group.",
  },
  {
    question: "Is my data secure?",
    answer: "Your expense data is stored locally on your device and synced via encrypted links. We don't store personal information on our servers. For more details, see our Privacy Policy.",
  },
  {
    question: "Can I edit or delete expenses?",
    answer: "Yes! Click on any expense to edit its details or delete it. Changes are reflected immediately in the balance calculations.",
  },
  {
    question: "How are settlements calculated?",
    answer: `${APP_NAME} uses an optimized algorithm to minimize the number of transactions needed to settle up. Instead of everyone paying everyone, we simplify to the fewest possible payments.`,
  },
  {
    question: "Is there a mobile app?",
    answer: `${APP_NAME} is a web app designed to work beautifully on mobile browsers. Add it to your home screen for an app-like experience! Native apps are on our roadmap.`,
  },
];

export default function FAQPage() {
  return (
    <Layout>
      <div className="container py-12 md:py-20 max-w-3xl">
        <div >
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-lg text-muted-foreground">
            Everything you need to know about {APP_NAME}
          </p>
        </div>

        <div>
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
      </div>
    </Layout>
  );
}
