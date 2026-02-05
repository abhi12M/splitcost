"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Users } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { GroupForm } from "@/components/group/GroupForm";
import { createGroup } from "@/lib/storage";
import { getEncryptedItem, setEncryptedItem } from "@/lib/localStorage";
import { LOCAL_CURRENCY_KEY, LOCAL_GROUPS_KEY } from "@/lib/constants";

export default function CreateGroupPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const defaultCurrency = getEncryptedItem(LOCAL_CURRENCY_KEY, "INR");

  const handleCreate = async (data: { name: string; currency: string; members: string[] }) => {
    setIsSubmitting(true);
    try {
      const group = await createGroup(data.name, data.currency, data.members);

      // Save to local list
      if (group) {
        const existing = getEncryptedItem<string[]>(LOCAL_GROUPS_KEY, []);
        if (!existing.includes(group.id)) {
          setEncryptedItem(LOCAL_GROUPS_KEY, [...existing, group.id]);
        }
        setEncryptedItem(LOCAL_CURRENCY_KEY, data.currency);

        router.push(`/group/${group.id}`);
      }
    } catch (error) {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="container py-8 max-w-xl">
        <Button variant="ghost" onClick={() => router.back()} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Card>
          <CardHeader>
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <Users className="text-primary" />
            </div>
            <CardTitle>Create a Group</CardTitle>
            <CardDescription>Start tracking shared expenses with friends.</CardDescription>
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
  );
}