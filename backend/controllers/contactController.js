import asyncHandler from "express-async-handler";
import nodemailer from "nodemailer";

// POST /api/contact
// Public: send contact email to site owner
export const sendContactMessage = asyncHandler(async (req, res) => {
  const { name, email, message } = req.body || {};

  if (!message || !email) {
    res.status(400);
    throw new Error("Email and message are required");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.CONTACT_EMAIL_USER,
      pass: process.env.CONTACT_EMAIL_PASS,
    },
  });

  const subject = name
    ? `New contact message from ${name}`
    : "New contact message from AudioPro site";

  const textLines = [
    name && `Name: ${name}`,
    email && `Email: ${email}`,
    "",
    message,
  ].filter(Boolean);

  const mailOptions = {
    from: process.env.CONTACT_EMAIL_USER,
    to: "xboxdakshin@gmail.com",
    replyTo: email,
    subject,
    text: textLines.join("\n"),
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "Message sent successfully" });
  } catch (err) {
    console.error("Contact email error:", err);
    res.status(500);
    throw new Error("Failed to send message. Please try again later.");
  }
});
