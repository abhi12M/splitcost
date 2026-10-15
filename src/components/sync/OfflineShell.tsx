"use client";

import { useEffect, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { CloudOff } from "lucide-react";

import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { useOnline } from "@/hooks/useOffline";
import { Link } from "@/i18n/navigation";
import { locales } from "@/i18n/routing";

const GroupDetails = dynamic(() => import("@/views/GroupDetails"), { ssr: false });
const ExpenseDetails = dynamic(() => import("@/views/ExpenseDetails"), { ssr: false });
const AddExpense = dynamic(() => import("@/views/AddExpense"), { ssr: false });
const EditExpense = dynamic(() => import("@/views/EditExpense"), { ssr: false });
const EditGroup = dynamic(() => import("@/views/EditGroup"), { ssr: false });
const GroupActivity = dynamic(() => import("@/views/GroupActivity"), { ssr: false });
const Groups = dynamic(() => import("@/views/Groups"), { ssr: false });
const AddGroup = dynamic(() => import("@/views/AddGroup"), { ssr: false });

/** The app screen for a URL, read from the URL itself (without its locale). */
function screenFor(path: string): ReactNode | null {
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 0 || (parts.length === 1 && parts[0] === "groups")) return <Groups />;
  if (parts.length === 1 && parts[0] === "create-group") return <AddGroup />;
  if (parts[0] !== "group" || !parts[1]) return null;

  const [, groupId, section, expenseId] = parts;
  if (!section) return <GroupDetails groupId={groupId} />;
  if (section === "add-expense") return <AddExpense groupId={groupId} />;
  if (section === "edit") return <EditGroup groupId={groupId} />;
  if (section === "activity") return <GroupActivity groupId={groupId} />;
  if (section === "expense" && expenseId) return <ExpenseDetails groupId={groupId} expenseId={expenseId} />;
  if (section === "edit-expense" && expenseId) return <EditExpense groupId={groupId} expenseId={expenseId} />;
  return null;
}

function withoutLocale(pathname: string) {
  const [first, ...rest] = pathname.split("/").filter(Boolean);
  return (locales as readonly string[]).includes(first) ? `/${rest.join("/")}` : pathname;
}

/**
 * The offline fallback page. The service worker serves it for any page it has
 * no saved copy of, so it renders the screen the URL asks for from the data on
 * this device; anything else gets a short explanation.
 */
export function OfflineShell() {
  const t = useTranslations("offline");
  // Decided after mounting: the server-rendered HTML is the same for every URL.
  const [screen, setScreen] = useState<ReactNode | null | undefined>(undefined);

  useEffect(() => {
    const path = withoutLocale(window.location.pathname);
    setScreen(path === "/offline" ? null : screenFor(path));
  }, []);

  // Standing in for a page that couldn't load: once the connection is back,
  // load the real page. Only for this explanation, which holds nothing; an app
  // screen rendered here may have a form in progress and catches up by itself.
  const online = useOnline();
  useEffect(() => {
    if (screen === null && online && withoutLocale(window.location.pathname) !== "/offline") {
      window.location.reload();
    }
  }, [screen, online]);

  if (screen === undefined) return null;
  if (screen) return <>{screen}</>;

  return (
    <Layout>
      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <CloudOff className="h-7 w-7 text-muted-foreground" aria-hidden />
        </div>
        <div className="max-w-md space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">{t("offlinePageTitle")}</h1>
          <p className="text-muted-foreground">{t("offlinePageMessage")}</p>
        </div>
        <Button asChild>
          <Link href="/groups">{t("offlinePageAction")}</Link>
        </Button>
      </div>
    </Layout>
  );
}
