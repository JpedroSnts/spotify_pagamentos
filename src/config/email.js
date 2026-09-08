import nodemailer from "nodemailer";
import "dotenv/config";

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_SMTP_HOST,
    port: Number(process.env.EMAIL_SMTP_PORT),
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

export async function sendEmail(to, subject, text, attachments = []) {
    const mailOptions = {
        from: `"Pagamentos Mensais" <siqueirasantos100@hotmail.com>`,
        to,
        bcc: process.env.ADMIN_EMAIL,
        subject,
        text: text.replace(/<\/?[^>]+(>|$)/g, ""),
        html: text,
        attachments
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Email enviado para ${to}`);
    } catch (error) {
        console.error(`Erro ao enviar email para ${to}:`, error);
        throw error;
    }
}
