import { cleanName, cleanText, isBlankText } from "@/lib/validations/names";

export const CONTACT_NAME_MAX = 100;
export const CONTACT_EMAIL_MAX = 254;
export const CONTACT_SUBJECT_MAX = 150;
export const CONTACT_MESSAGE_MAX = 5000;

/** Something@something.something, with no spaces: enough to catch typos without rejecting real addresses. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ContactInput = { name: string; email: string; subject: string; message: string };

/** The contact form values to send: names and subject on one line, message keeps its line breaks. */
export function cleanContactInput(input: ContactInput): ContactInput {
  return {
    name: cleanName(input.name),
    email: cleanName(input.email).toLowerCase(),
    subject: cleanName(input.subject),
    message: cleanText(input.message),
  };
}

/** Server-side check of the contact form. Returns the cleaned values to send. */
export function validateContactInput(body: Record<string, unknown>) {
  const { name, email, subject, message } = body;
  if (typeof name !== "string" || typeof email !== "string" || typeof subject !== "string" || typeof message !== "string") {
    return { success: false as const, error: "Name, email, subject and message are required." };
  }

  const cleaned = cleanContactInput({ name, email, subject, message });
  if (isBlankText(cleaned.name) || isBlankText(cleaned.subject) || isBlankText(cleaned.message)) {
    return { success: false as const, error: "Name, email, subject and message are required." };
  }
  if (cleaned.email.length > CONTACT_EMAIL_MAX || !EMAIL_PATTERN.test(cleaned.email)) {
    return { success: false as const, error: "Enter a valid email address." };
  }
  if (
    cleaned.name.length > CONTACT_NAME_MAX ||
    cleaned.subject.length > CONTACT_SUBJECT_MAX ||
    cleaned.message.length > CONTACT_MESSAGE_MAX
  ) {
    return { success: false as const, error: "Message is too long." };
  }

  return { success: true as const, data: cleaned };
}
