"use client"

import Link from "next/link"

import { BrandIcon } from "@/components/brand/BrandIcon"
import { APP_NAME } from "@/lib/constants"

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30 pb-[calc(4.25rem+env(safe-area-inset-bottom,0px))] sm:pb-0">
      <div className="container pt-10 pb-8 sm:pt-16 sm:pb-12 md:pt-20">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
          <div className="col-span-2 sm:col-span-3 lg:col-span-2">
            <Link
              href="/"
              className="flex items-center gap-3 mb-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-xl"
            >
              <BrandIcon className="h-10 w-auto" height={40} />
            </Link>
            <p className="text-sm text-muted-foreground max-w-sm">
              A free expense splitting app for friends, roommates, couples, and
              travel groups. Track shared bills, balances, and settlements
              without sign-up.
            </p>
          </div>

          <nav aria-label="Product links">
            <p className="font-semibold text-foreground mb-4">Product</p>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href="/#how-it-works"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
                >
                  How it works
                </Link>
              </li>
              <li>
                <Link
                  href="/#features"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link
                  href="/#use-cases"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
                >
                  Use cases
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Support links">
            <p className="font-semibold text-foreground mb-4">Support</p>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href="/#faq"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
                >
                  FAQ
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Legal links">
            <p className="font-semibold text-foreground mb-4">Legal</p>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href="/privacy"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
                >
                  Privacy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
                >
                  Terms
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-8 pt-8 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            {"(c)"} {new Date().getFullYear()} {APP_NAME}. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Split bills clearly, track balances accurately, and settle up faster
          </p>
        </div>
      </div>
    </footer>
  )
}
