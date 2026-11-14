
const dotenv = require("dotenv");
dotenv.config();

const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        type: "OAuth2",
        user: process.env.EMAIL_USER,
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: process.env.GOOGLE_REFRESH_TOKEN
    }
});

async function sendQuizResult(
    email,
    studentName,
    rollNumber,
    score,
    total,
    percentage
) {
    if (!email || !email.includes("@")) {
        throw new Error("Valid student email is required");
    }

    const mailOptions = {
        from: `"Testzen" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Your Testzen Assessment Result",
        html: `
            <h2>Testzen Assessment Result</h2>
            <p>Hello ${rollNumber},</p>
            <p>Your assessment has been completed successfully.</p>

            <table border="1" cellpadding="10" cellspacing="0">
                <tr><td>Roll Number</td><td>${rollNumber}</td></tr>
                <tr><td>Score</td><td>${score}/${total}</td></tr>
                <tr><td>Percentage</td><td>${percentage}%</td></tr>
            </table>

            <p>Thank you for using Testzen!</p>
        `
    };

    return transporter.sendMail(mailOptions);
}

module.exports = sendQuizResult;