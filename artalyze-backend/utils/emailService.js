const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

// Configure AWS SES
AWS.config.update({ region: process.env.AWS_REGION });

const ses = new AWS.SES();

// Read and prepare the HTML template
const otpTemplatePath = path.join(__dirname, '../templates/otpTemplate.html');
const loadTemplate = (otp) => {
    let template = fs.readFileSync(otpTemplatePath, 'utf8');
    return template.replace('123456', otp); // Replace with dynamic OTP
};

const sendEmail = async (to, subject, otp) => {
    const htmlBody = loadTemplate(otp); // Load and customize the template

    const params = {
        Source: 'Artalyze Support <info@artalyze.app>',
        Destination: {
            ToAddresses: [to],
        },
        Message: {
            Body: {
                Html: { Data: htmlBody },
            },
            Subject: { Data: subject },
        },
    };

    try {
        const result = await ses.sendEmail(params).promise();
        console.log("Email sent:", result);
    } catch (error) {
        console.error("Error sending email:", error);
    }
};

module.exports = sendEmail;
