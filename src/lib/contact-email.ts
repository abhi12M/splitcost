const FALLBACK_CONTACT_EMAIL = "";

/**
 * The public contact address, shared by the contact page, the contact API and
 * the structured data. It is a NEXT_PUBLIC_ variable so the client-side
 * contact page sees it too; the variable is read by its literal name so Next
 * can inline it into the client bundle.
 */
export function getContactEmail(): string {
  return process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || FALLBACK_CONTACT_EMAIL;
}
