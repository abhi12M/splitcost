"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { ArrowLeft, Users } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { GroupForm } from "@/components/group/GroupForm";
import { GroupFormMobile } from "@/components/group/GroupFormMobile";
import { Spinner } from "@/components/ui/Spinner";
import { useMdUp } from "@/hooks/useDeviceType";
import { createGroup } from "@/lib/storage";
import { toast } from "@/hooks/use-toast";
import { getEncryptedItem, migrateLocalStorageKey, setEncryptedItem } from "@/lib/localStorage";
import { LOCAL_CURRENCY_KEY, LOCAL_GROUPS_KEY } from "@/lib/constants";

if (typeof window !== "undefined") {
  migrateLocalStorageKey("my_currecny", LOCAL_CURRENCY_KEY);
}

export default function CreateGroupPage() {
  const t = useTranslations("group");
  const tCommon = useTranslations("common");
  const tToasts = useTranslations("toasts");
  const tOffline = useTranslations("offline");
  const router = useRouter();
  const isMdUp = useMdUp();
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Closes the last "couldn't create" toast once a retry succeeds.
  const saveErrorToastRef = useRef<(() => void) | null>(null);
  const defaultCurrency = getEncryptedItem(LOCAL_CURRENCY_KEY, "INR");

  const handleCreate = async (data: { name: string; currency: string; members: string[] }) => {
    setIsSubmitting(true);
    try {
      const group = await createGroup(data.name, data.currency, data.members);

      if (group) {
        const existing = getEncryptedItem<string[]>(LOCAL_GROUPS_KEY, []);
        if (!existing.includes(group.id)) {
          setEncryptedItem(LOCAL_GROUPS_KEY, [...existing, group.id]);
        }
        setEncryptedItem(LOCAL_CURRENCY_KEY, data.currency);

        saveErrorToastRef.current?.();
        if (group.local) {
          toast({ message: tOffline("groupCreatedLocal"), variant: "info" });
        }
        router.push(`/group/${group.id}`);
        return;
      }
      // createGroup returns nothing when the server refused; without this the
      // spinner stayed up forever.
      throw new Error("Failed to create group");
    } catch {
      saveErrorToastRef.current = toast({
        title: tToasts("couldNotCreateGroup"),
        description: tToasts("tryAgainHint"),
        variant: "error",
      }).dismiss;
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {isMdUp ? (
        <Layout>
          <div className="container max-w-xl py-8">
            <Button variant="ghost" onClick={() => router.back()} className="mb-6">
              <ArrowLeft className="mr-2 h-4 w-4" /> {tCommon("back")}
            </Button>
            <Card>
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Users className="text-primary" />
                </div>
                <h1 className="text-lg font-semibold tracking-tight text-foreground truncate">
                  {t("createGroupTitle")}
                </h1>
                <CardDescription>{t("createGroupDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                <GroupForm
                  onSubmit={handleCreate}
                  isSubmitting={isSubmitting}
                  submitLabel={t("createGroupSubmit")}
                  initialData={{ name: "", currency: defaultCurrency, members: [] }}
                />
              </CardContent>
            </Card>
          </div>
        </Layout>
      ) : (
        <GroupFormMobile
          backHref="/"
          initialCurrency={defaultCurrency}
          onSubmit={handleCreate}
        />
      )}

      <Spinner show={isSubmitting} message={tCommon("creating")} />
    </>
  );
}
