"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Users } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { GroupForm } from "@/components/group/GroupForm";
import { GroupFormMobile } from "@/components/group/GroupFormMobile";
import { Spinner } from "@/components/ui/Spinner";
import { createGroup } from "@/lib/storage";
import { getEncryptedItem, migrateLocalStorageKey, setEncryptedItem } from "@/lib/localStorage";
import { LOCAL_CURRENCY_KEY, LOCAL_GROUPS_KEY } from "@/lib/constants";

if (typeof window !== "undefined") {
  migrateLocalStorageKey("my_currecny", LOCAL_CURRENCY_KEY);
}

export default function CreateGroupPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
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

        router.push(`/group/${group.id}`);
      }
    } catch {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="hidden md:block">
        <Layout>
          <div className="container max-w-xl py-8">
            <Button variant="ghost" onClick={() => router.back()} className="mb-6">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <Card>
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Users className="text-primary" />
                </div>
                <CardTitle>Create a Group</CardTitle>
                <CardDescription>
                  Start tracking shared expenses with flexible splits, multiple payer
                  support, and a shareable group link.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <GroupForm
                  onSubmit={handleCreate}
                  isSubmitting={isSubmitting}
                  submitLabel="Create Group"
                  initialData={{ name: "", currency: defaultCurrency, members: [] }}
                />
              </CardContent>
            </Card>
          </div>
        </Layout>
      </div>

      <div className="block md:hidden">
        <GroupFormMobile
          backHref="/"
          initialCurrency={defaultCurrency}
          onSubmit={handleCreate}
        />
      </div>

      <Spinner show={isSubmitting} message="Creating..." />
    </>
  );
}
