import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : null;

type SendEmailParams = {
    to: string | string[];
    subject: string;
    html: string;
    attachments?: {
        filename: string;
        content: Buffer;
    }[];
};

export async function sendEmail({ to, subject, html, attachments }: SendEmailParams) {
    if (!resend) {
        console.warn("RESEND_API_KEY not configured. Mocking email send.");
        // In dev mode without keys, we just pretend it worked.
        // In prod, this should probably throw if email is critical.
        if (process.env.NODE_ENV === "production") {
            throw new Error("Servicio de correo no configurado (Falta RESEND_API_KEY)");
        }
        return { id: "mock-email-id" };
    }

    const { data, error } = await resend.emails.send({
        from: "Hostal Loreto Belén <reservas@hostalloretobelen.cl>", // Or a verified domain
        // If you don't have a specific domain verified in Resend, use 'onboarding@resend.dev' for testing
        // or throw error if 'from' domain is not set. 
        // Fallback for safety in early dev:
        // from: "onboarding@resend.dev",
        to,
        subject,
        html,
        attachments,
    });

    if (error) {
        console.error("Resend Error:", error);
        throw new Error(error.message);
    }

    return data;
}
