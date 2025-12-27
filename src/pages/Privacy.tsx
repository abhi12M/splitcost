import { motion } from "framer-motion";
import { Layout } from "@/components/layout/Layout";

export default function PrivacyPage() {
  return (
    <Layout>
      <div className="container py-12 md:py-20 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-8">
            Privacy Policy
          </h1>

          <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6 text-muted-foreground">
            <p>
              <strong className="text-foreground">Last updated:</strong> {new Date().toLocaleDateString()}
            </p>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">1. Information We Collect</h2>
              <p>
                SplitEase is designed with privacy in mind. We collect minimal information necessary to provide our service:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Expense data you enter (descriptions, amounts, participants)</li>
                <li>Group names and member names you provide</li>
                <li>Anonymous usage analytics to improve our service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">2. How We Store Your Data</h2>
              <p>
                Your expense data is primarily stored locally on your device. When you share a group link, 
                the data is encrypted and transmitted securely. We do not store personal identification 
                information on our servers.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">3. Third-Party Services</h2>
              <p>
                We may use third-party services for:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Analytics (Google Analytics) - to understand how users interact with our app</li>
                <li>Advertising (Google Ads) - to display relevant advertisements</li>
              </ul>
              <p>
                These services may collect anonymous usage data as described in their respective privacy policies.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">4. Cookies</h2>
              <p>
                We use cookies to enhance your experience and for analytics purposes. You can control 
                cookie preferences through your browser settings.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">5. Your Rights</h2>
              <p>
                You have the right to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Access the data you've entered</li>
                <li>Delete your groups and expense data</li>
                <li>Opt out of analytics tracking</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">6. Contact Us</h2>
              <p>
                If you have questions about this Privacy Policy, please contact us through our Contact page.
              </p>
            </section>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}
