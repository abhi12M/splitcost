import { Resend } from "resend";
import { readJsonObject } from "@/lib/api/request";
import { SUCCESS_MESSAGES, successJson } from "@/lib/api/success";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
    const parsed = await readJsonObject(req);
    if (!parsed.ok) return parsed.response;
    const { name, email, subject, message } = parsed.data;

    try {
        const data = await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: 'contact@splitcost.in',
            subject: subject || "New Contact Message",
            html: `
        <h2>New Contact Message</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      `
        });

        return successJson({ success: true, data }, SUCCESS_MESSAGES.contactSent);

    } catch (error) {
        return Response.json(
            { success: false, error: "Failed to send email" },
            { status: 500 }
        );
    }
}