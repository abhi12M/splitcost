"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
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
import { getContactEmail } from "@/lib/contact-email";
import { cn } from "@/lib/utils";
import {
  cleanContactInput,
  CONTACT_FIELDS,
  CONTACT_LIMITS,
  CONTACT_MESSAGE_MAX,
  CONTACT_MESSAGE_MIN,
  getContactFieldErrors,
  type ContactField,
  type ContactFieldErrors,
} from "@/lib/validations/contact";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CharacterCounter } from "@/components/ui/CharacterCounter";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// The unsent message, kept for this tab so a reload (e.g. while offline)
// doesn't lose it. Cleared once the message is sent.
const DRAFT_KEY = "splitcost:contact-draft";
const contactEmail = getContactEmail();
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

  // Field messages appear once the field has been left, or after a send
  // attempt, and then update as the user types. The checks are the same ones
  // the API runs (getContactFieldErrors).
  const [touched, setTouched] = useState<Partial<Record<ContactField, boolean>>>({});
  const [attempted, setAttempted] = useState(false);
  // What the server refused, if the form's own checks somehow passed.
  const [serverErrors, setServerErrors] = useState<ContactFieldErrors>({});
  const liveErrors = useMemo(() => getContactFieldErrors(cleanContactInput(form)), [form]);
  const errorFor = (field: ContactField) => {
    const code = serverErrors[field] ?? (attempted || touched[field] ? liveErrors[field] : undefined);
    if (!code) return undefined;
    if (code === "tooShort") return t("errorTooShort", { min: CONTACT_MESSAGE_MIN });
    if (code === "tooLong") return t("errorTooLong", { max: CONTACT_LIMITS[field] });
    if (code === "invalid") return t("errorEmailInvalid");
    return t(`error${field[0].toUpperCase()}${field.slice(1)}Required` as "errorNameRequired");
  };

  const updateField = (field: ContactField, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setServerErrors(({ [field]: _cleared, ...rest }) => rest);
  };
  const focusFirst = (errors: ContactFieldErrors) => {
    const first = CONTACT_FIELDS.find((field) => errors[field]);
    if (first) document.getElementById(first)?.focus();
  };
  // Props shared by every field: the blur that reveals its message, and the
  // accessibility wiring between the field and that message.
  const fieldProps = (field: ContactField) => {
    const error = errorFor(field);
    return {
      id: field,
      value: form[field],
      maxLength: CONTACT_LIMITS[field],
      onBlur: () => setTouched((current) => ({ ...current, [field]: true })),
      "aria-invalid": error ? true : undefined,
      "aria-describedby": error ? `${field}-error` : undefined,
      className: cn(error && "border-destructive focus-visible:ring-destructive"),
    };
  };
  const fieldError = (field: ContactField) => {
    const error = errorFor(field);
    return error ? (
      <p id={`${field}-error`} className="text-xs text-destructive">
        {error}
      </p>
    ) : null;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Offline: don't send; the message stays in the form (and the saved draft).
    if (!isOnline()) {
      showOfflineToast();
      return;
    }
    const cleaned = cleanContactInput(form);
    setAttempted(true);
    const errors = getContactFieldErrors(cleaned);
    if (Object.keys(errors).length) {
      focusFirst(errors);
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

      if (res.status === 400) {
        const payload = await res.json().catch(() => null);
        const fields = (payload?.fields ?? {}) as ContactFieldErrors;
        if (Object.keys(fields).length) {
          setServerErrors(fields);
          focusFirst(fields);
          setIsSubmitting(false);
          return;
        }
      }
      // Blocked by the rate limit: nothing is wrong, the message stays in the form to resend.
      if (res.status === 429) {
        toast({
          title: t("toastErrorTitle"),
          description: t("toastRateLimitDescription"),
          variant: "warning",
        });
        setIsSubmitting(false);
        return;
      }
      if (!res.ok) throw new Error();

      toast({
        title: t("toastSuccessTitle"),
        description: t("toastSuccessDescription"),
        variant:'success',
      });

      setForm(EMPTY_FORM);
      setAttempted(false);
      setTouched({});
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
                href={`mailto:${contactEmail}`}
                className="font-medium text-primary underline underline-offset-4 transition-colors hover:text-primary/80 dark:text-primary/90"
              >
                {contactEmail}
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
                  {/* noValidate: the form shows its own messages under the fields
                      (in the page's language) instead of the browser's pop-ups. */}
                  <form onSubmit={handleSubmit} noValidate className="space-y-5">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="name">{t("nameLabel")}</Label>
                        <Input
                          {...fieldProps("name")}
                          placeholder={t("namePlaceholder")}
                          autoComplete="name"
                          onChange={(e) => updateField("name", e.target.value)}
                        />
                        {fieldError("name")}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">{t("emailLabel")}</Label>
                        <Input
                          {...fieldProps("email")}
                          type="email"
                          inputMode="email"
                          autoComplete="email"
                          placeholder={t("emailPlaceholder")}
                          onChange={(e) => updateField("email", e.target.value)}
                        />
                        {fieldError("email")}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subject">{t("subjectLabel")}</Label>
                      <Input
                        {...fieldProps("subject")}
                        placeholder={t("subjectPlaceholder")}
                        onChange={(e) => updateField("subject", e.target.value)}
                      />
                      {fieldError("subject")}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">{t("messageLabel")}</Label>
                      <Textarea
                        {...fieldProps("message")}
                        placeholder={t("messagePlaceholder")}
                        rows={6}
                        onChange={(e) => updateField("message", e.target.value)}
                        className={cn(
                          "min-h-[140px] h-auto sm:min-h-[180px] sm:h-auto resize-y",
                          fieldProps("message").className
                        )}
                      />
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">{fieldError("message")}</div>
                        <CharacterCounter
                          current={form.message.length}
                          max={CONTACT_MESSAGE_MAX}
                          className="ml-auto shrink-0"
                        />
                      </div>
                    </div>

                    {/* Offline it looks disabled but still explains itself on tap. */}
                    <Button
                      type="submit"
                      size="lg"
                      className={cn("w-full sm:w-auto", !online && "opacity-50")}
                      disabled={isSubmitting}
                      aria-disabled={online ? undefined : true}
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
