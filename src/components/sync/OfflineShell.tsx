"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { CloudOff } from "lucide-react";

import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { useMounted } from "@/hooks/useMounted";
import { useOnline } from "@/hooks/useOffline";
import { Link } from "@/i18n/navigation";
import { appScreenFor } from "@/lib/offline/screens";

const GroupDetails = dynamic(() => import("@/views/GroupDetails"), { ssr: false });
const ExpenseDetails = dynamic(() => import("@/views/ExpenseDetails"), { ssr: false });
const AddExpense = dynamic(() => import("@/views/AddExpense"), { ssr: false });
const EditExpense = dynamic(() => import("@/views/EditExpense"), { ssr: false });
const EditGroup = dynamic(() => import("@/views/EditGroup"), { ssr: false });
const GroupActivity = dynamic(() => import("@/views/GroupActivity"), { ssr: false });
const Groups = dynamic(() => import("@/views/Groups"), { ssr: false });
const AddGroup = dynamic(() => import("@/views/AddGroup"), { ssr: false });

/** The view for an app screen, read from the URL itself (without its locale). */
function screenFor(path: string): ReactNode | null {
  const screen = appScreenFor(path);
  switch (screen?.name) {
    case "groups":
      return <Groups />;
    case "createGroup":
      return <AddGroup />;
    case "group":
      return <GroupDetails groupId={screen.groupId} />;
    case "addExpense":
      return <AddExpense groupId={screen.groupId} />;
    case "editGroup":
      return <EditGroup groupId={screen.groupId} />;
    case "activity":
      return <GroupActivity groupId={screen.groupId} />;
    case "expense":
      return <ExpenseDetails groupId={screen.groupId} expenseId={screen.expenseId} />;
    case "editExpense":
      return <EditExpense groupId={screen.groupId} expenseId={screen.expenseId} />;
    default:
      return null;
  }
}

/**
 * A page drawn from this device: the app screen the path asks for, from its
 * data, or a short explanation for any other page. `path` is without locale.
 */
export function OfflineScreen({ path }: { path: string }) {
  const t = useTranslations("offline");
  const screen = useMemo(() => (path === "/offline" ? null : screenFor(path)), [path]);

  // Standing in for a page that couldn't load: once the connection is back,
  // load the real page. Only for this explanation, which holds nothing; an app
  // screen rendered here may have a form in progress and catches up by itself.
  const online = useOnline();
  useEffect(() => {
    if (!screen && online && path !== "/offline") window.location.reload();
  }, [screen, online, path]);

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

/**
 * The offline fallback page. The service worker serves it for any page it has
 * no saved copy of; OfflineRouter then draws the page the address asks for.
 * Opened at its own address, it shows the explanation. Nothing renders before
 * mounting: the server-rendered HTML is the same for every address.
 */
export function OfflineShell() {
  const mounted = useMounted();
  return mounted ? <OfflineScreen path="/offline" /> : null;
}
