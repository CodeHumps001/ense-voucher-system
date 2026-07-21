"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = void 0;
const axios_1 = __importDefault(require("axios"));
const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
const sendEmail = async ({ toEmail, toName, subject, htmlContent, }) => {
    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL || "no-reply@expensesystem.com";
    const senderName = process.env.BREVO_SENDER_NAME || "Expense Management System";
    if (!apiKey) {
        console.warn("BREVO_API_KEY is not defined. Email simulation mode:");
        console.log(`To: ${toName} <${toEmail}> | Subject: ${subject}`);
        return;
    }
    try {
        await axios_1.default.post(BREVO_API_URL, {
            sender: { name: senderName, email: senderEmail },
            to: [{ email: toEmail, name: toName }],
            subject,
            htmlContent,
        }, {
            headers: {
                accept: "application/json",
                "api-key": apiKey,
                "content-type": "application/json",
            },
        });
    }
    catch (error) {
        console.error("Failed to send email via Brevo:", error.response?.data || error.message);
        throw new Error("Email delivery failed");
    }
};
exports.sendEmail = sendEmail;
