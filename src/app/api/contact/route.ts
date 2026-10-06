import { Resend } from "resend";
import { readJsonObject } from "@/lib/api/request";
import { SUCCESS_MESSAGES, successJson } from "@/lib/api/success";
import { validateContactInput } from "@/lib/validations/contact";

const resend = new Resend(process.env.RESEND_API_KEY);

/** Typed text is shown as text in the email, never as markup. */
const escapeHtml = (value: string) =>
    value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");

export async function POST(req: Request) {
    const parsed = await readJsonObject(req);
    if (!parsed.ok) return parsed.response;

    const input = validateContactInput(parsed.data);
    if (!input.success) {
        return Response.json({ success: false, error: input.error }, { status: 400 });
    }
    const { name, email, subject, message } = input.data;

    try {
        const data = await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: 'contact@splitcost.in',
            replyTo: email,
            subject,
            html: `
        <h2>New Contact Message</h2>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
        <p><strong>Message:</strong></p>
        <p>${escapeHtml(message).replaceAll("\n", "<br>")}</p>
      `,
            text: `Name: ${name}\nEmail: ${email}\nSubject: ${subject}\n\n${message}`,
        });

        return successJson({ success: true, data }, SUCCESS_MESSAGES.contactSent);

    } catch (error) {
        return Response.json(
            { success: false, error: "Failed to send email" },
            { status: 500 }
        );
    }
}
