import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ReceiptIcon } from "@/components/icons/CategoryIcons";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-lg">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <motion.div
            whileHover={{ rotate: -10 }}
            className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-glow"
          >
            <ReceiptIcon className="w-5 h-5 text-primary-foreground" />
          </motion.div>
          <span className="text-xl font-bold text-foreground">SplitEase</span>
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            to="/faq"
            className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
          >
            FAQ
          </Link>
          <Link
            to="/contact"
            className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
          >
            Contact
          </Link>
        </nav>
      </div>
    </header>
  );
}
