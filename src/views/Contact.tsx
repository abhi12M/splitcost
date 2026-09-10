"use client";

import { type FormEvent, useState } from "react";
import { motion } from "framer-motion";
import { Bug, Clock3, Handshake, Mail, Send } from "lucide-react";
import { useTranslations } from "next-intl";

import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { brandStyles } from "@/lib/brand-styles";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function ContactPage() {
  const t = useTranslations("contact");
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const contactReasons = [
    {
      icon: Bug,
      title: t("reasonBugTitle"),
      description: t("reasonBugDescription"),
    },
    {
      icon: Handshake,
      title: t("reasonFeedbackTitle"),
      description: t("reasonFeedbackDescription"),
    },
    {
      icon: Clock3,
      title: t("reasonFastTitle"),
      description: t("reasonFastDescription"),
    },
  ];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error();

      toast({
        title: t("toastSuccessTitle"),
        description: t("toastSuccessDescription"),
        variant:'success',
      });

      setForm({
        name: "",
        email: "",
        subject: "",
        message: "",
      });
    } catch {
      toast({
        title: t("toastErrorTitle"),
        description: t("toastErrorDescription"),
        variant:'error',
      });
    }

    setIsSubmitting(false);
  };

  return (
    <Layout>
      <div className="container py-12 md:py-[3rem]">
        <div className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-card/80 p-6 shadow-card md:p-10">
          <div className="pointer-events-none absolute inset-x-0 top-0 hidden h-32 bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/5 sm:block dark:hidden" />

          <div className="relative mb-8 max-w-2xl md:mb-10">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm text-muted-foreground dark:bg-primary-muted">
              <Mail className={cn("h-4 w-4 shrink-0", brandStyles.icon)} />
              {t("badge")}
            </div>
            <h1 className="text-3xl font-bold text-foreground md:text-4xl">
              {t("title", { appName: APP_NAME })}
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">{t("intro", { appName: APP_NAME })}</p>
            <p className="mt-3 text-muted-foreground">{t("introSecondary")}</p>
            <p className="mt-4 text-sm text-muted-foreground">
              {t("preferEmail")}{" "}
              <a
                href="mailto:contact@splitcost.in"
                className="font-medium text-primary underline underline-offset-4 transition-colors hover:text-primary/80 dark:text-primary/90"
              >
                contact@splitcost.in
              </a>
              .
            </p>
          </div>

          <div className="relative grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }}>
              <Card className="border-border/80 bg-background/70">
                <CardHeader>
                  <CardTitle className="text-2xl leading-tight">{t("whatToIncludeTitle")}</CardTitle>
                  <CardDescription>{t("whatToIncludeDescription")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {contactReasons.map(({ icon: Icon, title, description }) => (
                    <div
                      key={title}
                      className="flex gap-4 rounded-2xl border border-border/70 bg-card p-4"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl gradient-primary">
                        <Icon className="h-5 w-5 text-primary-foreground" />
                      </div>
                      <div>
                        <h2 className="font-semibold text-foreground">{title}</h2>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          {description}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-border/80">
                <CardHeader className="text-center sm:text-left">
                  <div
                    className={cn(
                      "mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl sm:mx-0",
                      brandStyles.iconCircle
                    )}
                  >
                    <Mail className={cn("h-8 w-8", brandStyles.icon)} />
                  </div>
                  <CardTitle className="text-2xl leading-tight">{t("formTitle")}</CardTitle>
                  <CardDescription>{t("formDescription", { appName: APP_NAME })}</CardDescription>
                </CardHeader>

                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="name">{t("nameLabel")}</Label>
                        <Input
                          id="name"
                          placeholder={t("namePlaceholder")}
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">{t("emailLabel")}</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder={t("emailPlaceholder")}
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subject">{t("subjectLabel")}</Label>
                      <Input
                        id="subject"
                        placeholder={t("subjectPlaceholder")}
                        value={form.subject}
                        onChange={(e) => setForm({ ...form, subject: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">{t("messageLabel")}</Label>
                      <Textarea
                        id="message"
                        placeholder={t("messagePlaceholder")}
                        rows={6}
                        value={form.message}
                        onChange={(e) => setForm({ ...form, message: e.target.value })}
                        required
                        className="min-h-[140px] h-auto sm:min-h-[180px] sm:h-auto resize-y"
                      />
                    </div>

                    <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={isSubmitting}>
                      {isSubmitting ? (
                        t("sending")
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          {t("sendMessage")}
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
