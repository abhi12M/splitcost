import { Layout } from "@/components/layout/Layout";
import { APP_NAME } from "@/lib/constants";
import { getCanonicalUrl } from "@/lib/seo";

export default function PrivacyPage() {
  const privacyJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${APP_NAME} Privacy Policy`,
    url: getCanonicalUrl("/privacy"),
    isPartOf: {
      "@type": "WebSite",
      name: APP_NAME,
      url: getCanonicalUrl("/"),
    },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: getCanonicalUrl("/"),
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Privacy Policy",
          item: getCanonicalUrl("/privacy"),
        },
      ],
    },
  };

  return (
    <Layout>
      <div className="container py-12 md:py-[3rem] max-w-3xl">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(privacyJsonLd) }}
        />

        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-8">
            Privacy Policy
          </h1>

          <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6 text-muted-foreground">
            <p className="text-base leading-7">
              This Privacy Policy explains what information {APP_NAME} uses to
              run shared expense groups, how that data is stored, and what
              choices you have. We aim to collect only the information needed
              to help groups track expenses, balances, and settlements.
            </p>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">
                1. Information We Collect
              </h2>
              <p>
                {APP_NAME} collects the information required to create and
                manage shared expense groups:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Group names, member names, and currency preferences</li>
                <li>Expense entries such as descriptions, amounts, payers, and participants</li>
                <li>Technical and analytics data that helps us improve performance and usability</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">
                2. How We Store Your Data
              </h2>
              <p>
                Group and expense data may be stored locally on your device and
                on secure third-party infrastructure so shared group links work
                across devices and sessions. We use reasonable technical
                safeguards to protect data in transit and at rest, but no
                internet-based system can be guaranteed to be completely secure.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">
                3. Third-Party Services
              </h2>
              <p>We may use third-party services that support the product, such as:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Analytics (Google Analytics)</li>
                <li>Hosting, database, and infrastructure providers</li>
                <li>Email and support tooling when you contact us</li>
              </ul>
              <p>
                These providers may process limited technical or usage data on
                our behalf as described in their own privacy policies.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">
                4. Cookies
              </h2>
              <p>
                {APP_NAME} may use cookies or similar technologies for analytics,
                session continuity, and product functionality. You can manage
                many of these preferences through your browser settings.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">
                5. Your Rights
              </h2>
              <p>Depending on your location, you may have the right to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Request access to the data associated with your use of the service</li>
                <li>Delete expense data that you control</li>
                <li>Limit analytics through browser controls or privacy tools</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">
                6. Policy Updates
              </h2>
              <p>
                We may update this Privacy Policy when the product, legal
                requirements, or data practices change. Continued use of the
                service after an update means the revised policy applies.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">
                7. Contact Us
              </h2>
              <p>
                If you have questions about this Privacy Policy or want to
                request help related to your data, please contact us through the
                Contact page.
              </p>
            </section>
          </div>
        </div>
      </div>
    </Layout>
  );
}
