
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
    const mailOptions = {
        from: `"Testzen" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Your Assessment Result - Testzen",
        html: `
            <h2>Testzen Assessment Result</h2>
            <p>Hello ${studentName},</p>
            <p>Roll Number: ${rollNumber}</p>
            <p>Score: ${score}/${total}</p>
            <p>Percentage: ${percentage}%</p>
        `
    };

    return await transporter.sendMail(mailOptions);
}

module.exports = sendQuizResult;
