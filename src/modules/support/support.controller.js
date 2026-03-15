import { sendEmail } from "../../utils/email.js";
import logger from "../../utils/logger.js";

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "monlykingstore@gmail.com";

function isValidEmail(email = "") {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

export const sendSupportMessage = async (req, res) => {
    try {
        const name = String(req.body?.name || "").trim();
        const email = String(req.body?.email || "").trim();
        const message = String(req.body?.message || "").trim();

        if (name.length < 2 || name.length > 100) {
            return res.status(400).json({ success: false, message: "Name must be between 2 and 100 characters" });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({ success: false, message: "Please provide a valid email" });
        }

        if (message.length < 10 || message.length > 2000) {
            return res.status(400).json({ success: false, message: "Message must be between 10 and 2000 characters" });
        }

        if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
            logger.warn("[Support] SMTP is not configured; support message not sent");
            return res.status(503).json({
                success: false,
                message: "Support email service is temporarily unavailable",
            });
        }

        const subject = `Website Support Request - ${name}`;
        const content = [
            "New support request from website:",
            "",
            `Name: ${name}`,
            `Email: ${email}`,
            "",
            "Message:",
            message,
        ].join("\n");

        await sendEmail(SUPPORT_EMAIL, subject, content);

        return res.status(200).json({
            success: true,
            message: "Your message has been sent successfully",
        });
    } catch (err) {
        logger.error(`[Support] sendSupportMessage error: ${err.message}`);
        return res.status(500).json({ success: false, message: "Failed to send support message" });
    }
};
