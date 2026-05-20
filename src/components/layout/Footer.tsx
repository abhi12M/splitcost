"use client"

import Link from "next/link"

import { BrandWordmark } from "@/components/brand/BrandWordmark"
import { BrandIcon } from "@/components/brand/BrandIcon"
import { APP_NAME } from "@/lib/constants"

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <Link
              href="/"
              className="flex items-center gap-3 mb-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-xl"
            >
              <BrandIcon className="w-11 h-11" size={44} />
              <BrandWordmark className="text-lg" />
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
                  href="/faq"
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
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
                >
                  Terms of Service
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
