import { motion } from "framer-motion";
import { Layout } from "@/components/layout/Layout";
import { APP_NAME } from "@/lib/constants";

export default function TermsPage() {
  return (
    <Layout>
      <div className="container py-12 md:py-20 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-8">
            Terms & Conditions
          </h1>

          <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6 text-muted-foreground">
            <p>
              <strong className="text-foreground">Last updated:</strong> {new Date().toLocaleDateString()}
            </p>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">1. Acceptance of Terms</h2>
              <p>
                By accessing and using {APP_NAME}, you accept and agree to be bound by these Terms and 
                Conditions. If you do not agree to these terms, please do not use our service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">2. Description of Service</h2>
              <p>
                {APP_NAME} is a web application that helps users track and split shared expenses among 
                groups of people. The service is provided "as is" without warranties of any kind.
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
                <li>Not using the service for illegal or unauthorized purposes</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">4. Limitation of Liability</h2>
              <p>
                {APP_NAME} is a tool to help calculate expense splits. We are not responsible for:
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
                The {APP_NAME} name, logo, and all related content are the property of {APP_NAME}. 
                You may not use our branding without prior written permission.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">6. Modifications</h2>
              <p>
                We reserve the right to modify these terms at any time. Continued use of the service 
                after changes constitutes acceptance of the new terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">7. Termination</h2>
              <p>
                We may terminate or suspend access to our service immediately, without prior notice, 
                for conduct that we believe violates these Terms or is harmful to other users.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">8. Contact</h2>
              <p>
                For questions about these Terms, please contact us through our Contact page.
              </p>
            </section>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}
