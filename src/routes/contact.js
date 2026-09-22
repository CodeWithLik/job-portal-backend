const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

router.post('/', async (req, res) => {
  try {
    const { role, name, email, message, ticketId } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'Name, email, and message are required' });
    }

    // 1. Create the transporter using exact .env variables
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,   // "smtp.gmail.com"
      port: process.env.SMTP_PORT,   // 465
      secure: true,                  // true for port 465
      auth: {
        user: process.env.SMTP_USER, // "likanostegene@gmail.com"
        pass: process.env.SMTP_PASS, // Your Gmail App Password
      },
      tls: {
        rejectUnauthorized: false    // Bypasses corporate firewall MITM issues
      }
    });

    // 2. Send the message TO YOURSELF (or your support team)
    await transporter.sendMail({
      from: `"AI Job Portal Support Form" <${process.env.SMTP_USER}>`, 
      to: process.env.SMTP_USER, 
      replyTo: email, 
      subject: `[${ticketId}] New Support Ticket from ${name} (${role})`,
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>New Support Request (${ticketId})</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Role:</strong> ${role}</p>
          <hr />
          <p><strong>Message:</strong></p>
          <p style="white-space: pre-wrap; background: #f8fafc; padding: 15px; border-radius: 8px;">${message}</p>
        </div>
      `
    });

    res.status(200).json({ success: true, message: 'Message sent successfully' });
  } catch (error) {
    console.error('Contact Form Error:', error);
    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
});

module.exports = router;
