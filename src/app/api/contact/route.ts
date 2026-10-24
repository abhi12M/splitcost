import { Resend } from "resend";
import { readJsonObject } from "@/lib/api/request";
import { SUCCESS_MESSAGES, successJson } from "@/lib/api/success";
import { getContactEmail } from "@/lib/contact-email";
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
    const parsed = await readJsonObject(req, {
      allowedKeys: ["name", "email", "subject", "message"],
    });
    if (!parsed.ok) return parsed.response;

    const input = validateContactInput(parsed.data);
    if (!input.success) {
        return Response.json({ success: false, error: input.error, fields: input.fields }, { status: 400 });
    }
    const { name, email, subject, message } = input.data;
    const contactEmail = getContactEmail();

    try {
        const { data, error } = await resend.emails.send({
            from: `SplitCost Contact <${contactEmail}>`,
            to: contactEmail,
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

        // Resend reports a refused email in `error` instead of throwing.
        if (error) {
            console.error("Contact email was not sent:", error);
            return Response.json(
                { success: false, error: "Failed to send email" },
                { status: 500 }
            );
        }

        return successJson({ success: true, data }, SUCCESS_MESSAGES.contactSent);

    } catch (error) {
        console.error("Contact email failed:", error);
        return Response.json(
            { success: false, error: "Failed to send email" },
            { status: 500 }
        );
    }
}
