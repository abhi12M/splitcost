import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
    try {
        const { name, email, subject, message } = await req.json();

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

        return Response.json({ success: true, data });

    } catch (error) {
        return Response.json(
            { success: false, error: "Failed to send email" },
            { status: 500 }
        );
    }
}