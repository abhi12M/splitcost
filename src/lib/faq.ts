import { APP_NAME } from "@/lib/constants";
import { getCanonicalUrl } from "@/lib/seo";

export type FaqItem = {
  question: string;
  answer: string;
};

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: `What is ${APP_NAME}?`,
    answer: `${APP_NAME} is a free group expense tracker that helps friends, roommates, and travel groups split bills, track balances, and settle up faster.`,
  },
  {
    question: `Does ${APP_NAME} support different currencies?`,
    answer: `Yes. You can set a group currency when creating or editing a group, which makes ${APP_NAME} useful for international trips and shared payments across currencies.`,
  },
  {
    question: `Do I need to create an account to use ${APP_NAME}?`,
    answer: `No. You can create a group and start tracking shared expenses instantly. Share a group link so others can join without everyone needing to sign up.`,
  },
  {
    question: "Can I upload receipts or attachments?",
    answer:
      "Yes. You can attach receipts, invoices, and payment screenshots to keep every expense organized and easy to verify.",
  },
  {
    question: `How can I split expenses in ${APP_NAME}?`,
    answer:
      "You can split bills equally, by percentage, or with custom amounts depending on how your group wants to share each expense.",
  },
  {
    question: "Can multiple people pay for the same expense?",
    answer: `Yes. ${APP_NAME} supports multiple payers for a single expense, which is helpful for shared bookings, travel costs, and group payments.`,
  },
  {
    question: `Can I track travel expenses with ${APP_NAME}?`,
    answer: `Yes. ${APP_NAME} works well for trips and travel groups, including transport, hotels, food, and other shared travel costs.`,
  },
  {
    question: "Can I export expense reports?",
    answer: `Yes. You can download expense reports and balance summaries for records, reimbursements, or planning.`,
  },
  {
    question: `Is ${APP_NAME} mobile friendly?`,
    answer: `Yes. ${APP_NAME} is optimized for phones and tablets, so you can add expenses and check balances on the go.`,
  },
  {
    question: `Who can use ${APP_NAME}?`,
    answer: `${APP_NAME} works well for roommates, couples, travel groups, friends, teams, events, and anyone managing shared expenses together.`,
  },
];

export function buildFaqPageJsonLd(items: FaqItem[] = FAQ_ITEMS) {
  const pageUrl = getCanonicalUrl("/");

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${pageUrl}#faq`,
    url: pageUrl,
    inLanguage: "en",
    mainEntity: items.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}
