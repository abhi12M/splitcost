"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ReceiptIcon } from "@/components/icons/CategoryIcons";
import { APP_NAME } from "@/lib/constants";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-lg">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg">
          <motion.div
            whileHover={{ rotate: -10 }}
            className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-glow"
          >
            <ReceiptIcon className="w-5 h-5 text-primary-foreground" />
          </motion.div>
          <span className="text-xl font-bold text-foreground">{APP_NAME}</span>
        </Link>

        <nav className="flex items-center gap-1" aria-label="Primary">
          <Link
            href="/faq"
            className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            FAQ
          </Link>
          <Link
            href="/contact"
            className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Contact
          </Link>
        </nav>
      </div>
    </header>
  );
}
