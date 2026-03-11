"use client";

import { type FormEvent, useState } from "react";
import { motion } from "framer-motion";
import { Bug, Clock3, Handshake, Mail, Send } from "lucide-react";

import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { APP_NAME } from "@/lib/constants";
import { getCanonicalUrl } from "@/lib/seo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function ContactPage() {
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
      title: "Bug reports",
      description: "Share what broke, what device you used, and how to reproduce it.",
    },
    {
      icon: Handshake,
      title: "Feedback and partnerships",
      description: "Tell us what your group needs or reach out about collaboration.",
    },
    {
      icon: Clock3,
      title: "Fast review",
      description: "We read every message and prioritize support that blocks active groups.",
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
        title: "Message sent!",
        description: "We'll get back to you as soon as possible.",
      });

      setForm({
        name: "",
        email: "",
        subject: "",
        message: "",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
      });
    }

    setIsSubmitting(false);
  };

  const contactJsonLd = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: `Contact ${APP_NAME}`,
    url: getCanonicalUrl("/contact"),
    description:
      "Contact Splitcost for support, product feedback, bug reports, and partnership inquiries.",
  };

  return (
    <Layout>
      <div className="container py-12 md:py-[3rem]">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(contactJsonLd) }}
        />

        <div className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-card/80 p-6 shadow-card md:p-10">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/5 blur-3xl" />

          <div className="relative mb-8 max-w-2xl md:mb-10">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/80 px-3 py-1 text-sm text-muted-foreground">
              <Mail className="h-4 w-4 text-secondary" />
              Support, feedback, and product questions
            </div>
            <h1 className="text-3xl font-bold text-foreground md:text-4xl">
              Contact Splitcost Support
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Need help with a shared expense group, a bill split, or a feature question?
              Use the form below to reach the {APP_NAME} team.
            </p>
            <p className="mt-3 text-muted-foreground">
              Send bug reports, feedback, partnership inquiries, or questions about how
              the product works for friends, roommates, travel groups, and events.
            </p>
          </div>

          <div className="relative grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }}>
              <Card className="border-border/80 bg-background/70">
                <CardHeader>
                  <CardTitle className="text-2xl leading-tight">What to include</CardTitle>
                  <CardDescription>
                    A little context helps us answer faster and avoid back-and-forth.
                  </CardDescription>
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
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl gradient-coral sm:mx-0 mx-auto">
                    <Mail className="h-8 w-8 text-secondary-foreground" />
                  </div>
                  <CardTitle className="text-2xl leading-tight">Send a Message</CardTitle>
                  <CardDescription>
                    Ask for support, share feedback, or tell us what would make{" "}
                    {APP_NAME} more useful for your group.
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                          id="name"
                          placeholder="Your name"
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="you@example.com"
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject</Label>
                      <Input
                        id="subject"
                        placeholder="What's this about?"
                        value={form.subject}
                        onChange={(e) => setForm({ ...form, subject: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">Message</Label>
                      <Textarea
                        id="message"
                        placeholder="Tell us more..."
                        rows={6}
                        value={form.message}
                        onChange={(e) => setForm({ ...form, message: e.target.value })}
                        required
                        className="min-h-[140px] h-auto sm:min-h-[180px] sm:h-auto resize-y"
                      />
                    </div>

                    <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={isSubmitting}>
                      {isSubmitting ? (
                        "Sending..."
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Send Message
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
