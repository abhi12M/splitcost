"use client";

import { Layout } from "@/components/layout/Layout";
import { GroupsListSection } from "@/components/groups/GroupsListSection";
import { ExpenseProblemsSection } from "@/components/landing/ExpenseProblemsSection";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { UseCasesSection } from "@/components/landing/UseCasesSection";
import { FaqSection } from "@/components/landing/FaqSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";

export default function HomePage({ adminMode = false }: { adminMode?: boolean }) {
  if (adminMode) {
    return (
      <Layout>
        <GroupsListSection adminMode />
      </Layout>
    );
  }

  return (
    <Layout>
      <HeroSection />
      <ExpenseProblemsSection />
      <HowItWorksSection />
      <FeaturesSection />
      <UseCasesSection />
      <FaqSection />
    </Layout>
  );
}
