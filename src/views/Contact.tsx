"use client";

import { type FormEvent, useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { motion } from "framer-motion";
import { Bug, Clock3, Handshake, Mail, Send } from "lucide-react";
import { useTranslations } from "next-intl";

import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useOnline } from "@/hooks/useOffline";
import { isOfflineError, isOnline, trackedFetch } from "@/lib/offline/network";
import { brandStyles } from "@/lib/brand-styles";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  cleanContactInput,
  CONTACT_EMAIL_MAX,
  CONTACT_MESSAGE_MAX,
  CONTACT_NAME_MAX,
  CONTACT_SUBJECT_MAX,
} from "@/lib/validations/contact";
import { isBlankText } from "@/lib/validations/names";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// The unsent message, kept for this tab so a reload (e.g. while offline)
// doesn't lose it. Cleared once the message is sent.
const DRAFT_KEY = "splitcost:contact-draft";
const EMPTY_FORM = { name: "", email: "", subject: "", message: "" };

function readDraft(): typeof EMPTY_FORM | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? { ...EMPTY_FORM, ...JSON.parse(raw) } : null;
  } catch {
    return null;
  }
}

function writeDraft(form: typeof EMPTY_FORM) {
  try {
    if (Object.values(form).some((value) => value.trim())) sessionStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    else sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // Storage unavailable (e.g. private mode): the draft just isn't kept.
  }
}

export default function ContactPage() {
  const t = useTranslations("contact");
  const tOffline = useTranslations("offline");
  const { toast } = useToast();
  const online = useOnline();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  // Restored after mounting so the server render and the first client render match.
  const [draftLoaded, setDraftLoaded] = useState(false);
  useEffect(() => {
    const draft = readDraft();
    if (draft) setForm(draft);
    setDraftLoaded(true);
  }, []);
  useEffect(() => {
    if (draftLoaded) writeDraft(form);
  }, [form, draftLoaded]);

  const showOfflineToast = () =>
    toast({ message: tOffline("contactOffline"), variant: "info", duration: 4_000 });

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

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Offline: don't send; the message stays in the form (and the saved draft).
    if (!isOnline()) {
      showOfflineToast();
      return;
    }
    const formElement = e.currentTarget;
    const cleaned = cleanContactInput(form);
    // A field holding only spaces or invisible characters passes the browser's
    // "required" check; show it cleaned (empty) so the browser asks for it.
    if (isBlankText(cleaned.name) || isBlankText(cleaned.subject) || isBlankText(cleaned.message)) {
      flushSync(() => setForm(cleaned));
      formElement.reportValidity();
      return;
    }
    setIsSubmitting(true);

    try {
      const res = await trackedFetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cleaned),
      });

      if (!res.ok) throw new Error();

      toast({
        title: t("toastSuccessTitle"),
        description: t("toastSuccessDescription"),
        variant:'success',
      });

      setForm(EMPTY_FORM);
    } catch (error) {
      // The connection dropped while sending: same message as offline.
      if (isOfflineError(error)) {
        showOfflineToast();
      } else {
        toast({
          title: t("toastErrorTitle"),
          description: t("toastErrorDescription"),
          variant:'error',
        });
      }
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
                          maxLength={CONTACT_NAME_MAX}
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
                          maxLength={CONTACT_EMAIL_MAX}
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
                        maxLength={CONTACT_SUBJECT_MAX}
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
                        maxLength={CONTACT_MESSAGE_MAX}
                        required
                        className="min-h-[140px] h-auto sm:min-h-[180px] sm:h-auto resize-y"
                      />
                    </div>

                    {/* Offline it looks disabled but still explains itself on tap (a
                        plain button, so the browser's required-field check doesn't
                        answer first). */}
                    <Button
                      type={online ? "submit" : "button"}
                      size="lg"
                      className={cn("w-full sm:w-auto", !online && "opacity-50")}
                      disabled={isSubmitting}
                      aria-disabled={online ? undefined : true}
                      onClick={online ? undefined : showOfflineToast}
                    >
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
