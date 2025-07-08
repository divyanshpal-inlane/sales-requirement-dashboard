const nodemailer = require("nodemailer");

// Replace with your details
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // true for 465, false for 587
  auth: {
    user: "ankit.inlane@gmail.com",
    pass: "pfuhycleadpuqojo",
  },
});

const mailOptions = {
  from: "ankit.inlane@gmail.com",
  to: "ankit.inlane@gmail.com",
  subject: "SMTP Test",
  text: "If you received this, SMTP is working!",
};

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    return console.log("Error:", error);
  }
  console.log("Success! Message sent:", info.response);
});
