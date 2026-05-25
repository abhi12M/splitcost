"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Shield, Smartphone, Sparkles, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { landingSection } from "@/lib/brand-styles";
import { cn } from "@/lib/utils";

export function HeroSection() {
  return (
    <section
      className={cn(
        "gradient-hero relative overflow-hidden border-b pt-6 pb-12 sm:py-24 lg:py-10",
        landingSection.divider
      )}
    >
      {/* Decorative background elements */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 hidden h-[800px] w-[1200px] -translate-x-1/2 rounded-full bg-primary/[0.04] blur-3xl sm:block dark:hidden"
        aria-hidden
      />
      
      <div className="container relative z-10 mx-auto px-4 text-center">
        <div className="mb-6 flex justify-center sm:mb-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">
            <Sparkles className="h-4 w-4" aria-hidden />
            Smart Expense Sharing
          </span>
        </div>

        <h1 className="mx-auto mb-6 max-w-4xl text-balance text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-[3rem] lg:leading-[1.1]">
          Smart Split Expenses App for <br className="hidden sm:block" />
          <span className="text-primary">Shared Bills & Group Payments</span>
        </h1>

        <p className="mx-auto mb-10 max-w-2xl text-balance text-lg text-muted-foreground sm:text-xl">
          Track shared expenses, split bills instantly, manage balances, and
          simplify group payments with one easy expense sharing platform.
        </p>

        <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-4 sm:max-w-none sm:flex-row sm:gap-4">
          <Button
            asChild
            size="lg"
            className="h-14 w-full rounded-full px-8 text-base font-semibold sm:w-auto"
          >
            <Link href="/create-group">
              Start Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="h-14 w-full rounded-full border-border bg-background px-8 text-base font-semibold hover:bg-muted sm:w-auto"
          >
            <Link href="/create-group">
              <UserPlus className="mr-2 h-5 w-5" />
              Create a Group
            </Link>
          </Button>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm font-medium text-muted-foreground">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            <span>100% Free to start</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <span>No credit card required</span>
          </div>
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            <span>Works on Web & Mobile</span>
          </div>
        </div>
      </div>
    </section>
  );
}
