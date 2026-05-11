import { Layout } from "@/components/layout/Layout";
import { APP_NAME } from "@/lib/constants";
import { getCanonicalUrl } from "@/lib/seo";

export default function TermsPage() {
  const termsJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${APP_NAME} Terms of Service`,
    url: getCanonicalUrl("/terms"),
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
          name: "Terms of Service",
          item: getCanonicalUrl("/terms"),
        },
      ],
    },
  };

  return (
    <Layout>
      <div className="container py-12 md:py-[3rem] max-w-3xl">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(termsJsonLd) }}
        />

        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-8">
            Terms of Service
          </h1>

          <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6 text-muted-foreground">
            <p className="text-base leading-7">
              These Terms of Service govern your use of {APP_NAME}. The product
              helps groups record shared expenses, calculate balances, and
              simplify settlements, but users remain responsible for reviewing
              entries and resolving payment disputes.
            </p>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">1. Acceptance of Terms</h2>
              <p>
                By accessing or using {APP_NAME}, you agree to these Terms of
                Service. If you do not agree, you should stop using the
                service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">2. Description of Service</h2>
              <p>
                {APP_NAME} is a web-based expense tracker that allows groups to
                create shared expense records, assign payers and participants,
                and review balances. The service is provided on an "as is" and
                "as available" basis.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">3. User Responsibilities</h2>
              <p>
                You are responsible for:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>The accuracy of expense data you enter</li>
                <li>Keeping your group links secure</li>
                <li>Using the service in compliance with applicable laws</li>
                <li>Not using the service for illegal, harmful, or unauthorized purposes</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">4. Limitation of Liability</h2>
              <p>
                {APP_NAME} is a calculation and record-keeping tool. We are not
                responsible for:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Disputes between users regarding expenses</li>
                <li>Inaccurate calculations due to user input errors</li>
                <li>Loss of data due to technical issues</li>
                <li>Any financial decisions made based on our calculations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">5. Intellectual Property</h2>
              <p>
                The {APP_NAME} name, logo, design elements, and related content
                are owned by {APP_NAME} or its licensors. You may not reuse our
                branding without permission.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">6. Modifications</h2>
              <p>
                We may update these terms from time to time. Continued use of
                the service after an update means you accept the revised terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">7. Termination</h2>
              <p>
                We may suspend or terminate access if we believe a user has
                violated these terms or used the service in a way that harms the
                platform or other users.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">8. Contact</h2>
              <p>
                For questions about these terms, please contact us through the
                Contact page.
              </p>
            </section>
          </div>
        </div>
      </div>
    </Layout>
  );
}
