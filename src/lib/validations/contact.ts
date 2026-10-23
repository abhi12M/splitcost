import { cleanName, cleanText, isBlankText } from "@/lib/validations/names";

export const CONTACT_NAME_MAX = 100;
export const CONTACT_EMAIL_MAX = 254;
export const CONTACT_SUBJECT_MAX = 150;
export const CONTACT_MESSAGE_MAX = 5000;
export const CONTACT_MESSAGE_MIN = 10;

/**
 * name@domain.tld without spaces: no leading, trailing or doubled dots in the
 * name, a domain made of dot-separated labels (letters, digits and inner
 * hyphens, any language), and a last part of at least two letters. Catches
 * typos like "a@b.c" or "a@b..c" without rejecting real addresses.
 */
const EMAIL_PATTERN =
  /^[^\s@.]+(?:\.[^\s@.]+)*@(?:[\p{L}\p{N}](?:[\p{L}\p{N}-]*[\p{L}\p{N}])?\.)+(?:\p{L}{2,}|xn--[a-z0-9-]+)$/u;

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

export type ContactField = keyof ContactInput;
export type ContactFieldError = "required" | "invalid" | "tooShort" | "tooLong";
export type ContactFieldErrors = Partial<Record<ContactField, ContactFieldError>>;

export const CONTACT_LIMITS: Record<ContactField, number> = {
  name: CONTACT_NAME_MAX,
  email: CONTACT_EMAIL_MAX,
  subject: CONTACT_SUBJECT_MAX,
  message: CONTACT_MESSAGE_MAX,
};

/** The fields in the order the form shows them, for focusing the first problem. */
export const CONTACT_FIELDS: ContactField[] = ["name", "email", "subject", "message"];

/**
 * What is wrong with each field of cleaned contact input, if anything. Shared
 * by the form (messages under the fields) and the API, so they always agree.
 */
export function getContactFieldErrors(cleaned: ContactInput): ContactFieldErrors {
  const errors: ContactFieldErrors = {};
  for (const field of CONTACT_FIELDS) {
    const value = cleaned[field];
    if (isBlankText(value)) errors[field] = "required";
    else if (value.length > CONTACT_LIMITS[field]) errors[field] = "tooLong";
  }
  if (!errors.message && cleaned.message.length < CONTACT_MESSAGE_MIN) errors.message = "tooShort";
  if (!errors.email && !EMAIL_PATTERN.test(cleaned.email)) errors.email = "invalid";
  return errors;
}

/**
 * Server-side check of the contact form. Returns the cleaned values to send,
 * or what is wrong with each field (`fields`) so the form can show it.
 */
export function validateContactInput(body: Record<string, unknown>) {
  const { name, email, subject, message } = body;
  if (typeof name !== "string" || typeof email !== "string" || typeof subject !== "string" || typeof message !== "string") {
    return { success: false as const, error: "Name, email, subject and message are required.", fields: {} };
  }

  const cleaned = cleanContactInput({ name, email, subject, message });
  const fields = getContactFieldErrors(cleaned);
  if (Object.keys(fields).length) {
    const error =
      Object.values(fields).includes("required")
        ? "Name, email, subject and message are required."
        : fields.email === "invalid"
          ? "Enter a valid email address."
          : fields.message === "tooShort"
            ? `Message must be at least ${CONTACT_MESSAGE_MIN} characters.`
            : "Message is too long.";
    return { success: false as const, error, fields };
  }

  return { success: true as const, data: cleaned };
}
