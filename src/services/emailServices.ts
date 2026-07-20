import axios from "axios";

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

interface EmailParams {
  toEmail: string;
  toName: string;
  subject: string;
  htmlContent: string;
}

export const sendEmail = async ({
  toEmail,
  toName,
  subject,
  htmlContent,
}: EmailParams) => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail =
    process.env.BREVO_SENDER_EMAIL || "no-reply@expensesystem.com";
  const senderName =
    process.env.BREVO_SENDER_NAME || "Expense Management System";

  if (!apiKey) {
    console.warn("BREVO_API_KEY is not defined. Email simulation mode:");
    console.log(`To: ${toName} <${toEmail}> | Subject: ${subject}`);
    return;
  }

  try {
    await axios.post(
      BREVO_API_URL,
      {
        sender: { name: senderName, email: senderEmail },
        to: [{ email: toEmail, name: toName }],
        subject,
        htmlContent,
      },
      {
        headers: {
          accept: "application/json",
          "api-key": apiKey,
          "content-type": "application/json",
        },
      },
    );
  } catch (error: any) {
    console.error(
      "Failed to send email via Brevo:",
      error.response?.data || error.message,
    );
    throw new Error("Email delivery failed");
  }
};
