const AWS = require('aws-sdk');
const juice = require('juice');
const fs = require('fs');
const path = require('path');

// Configure AWS SES
AWS.config.update({ region: process.env.AWS_REGION });
const ses = new AWS.SES();

// Load HTML template dynamically
const loadTemplate = (type, data) => {
    const templatePath = path.join(__dirname, `../templates/${type}Template.html`);
    const cssPath = path.join(__dirname, '../templates/emailStyles.css');

    try {
        let templateHtml = fs.readFileSync(templatePath, 'utf8');
        const css = fs.readFileSync(cssPath, 'utf8');

        // Inline the shared CSS
        templateHtml = juice.inlineContent(templateHtml, css);

        // Replace placeholders with dynamic data
        for (const [key, value] of Object.entries(data)) {
            templateHtml = templateHtml.replace(new RegExp(`{{${key}}}`, 'g'), value);
        }

        return templateHtml;
    } catch (error) {
        console.error(`Error loading template for type '${type}':`, error);
        throw error;
    }
};

// Send email using AWS SES
const sendEmail = async (to, subject, type, data) => {
    try {
        const htmlBody = loadTemplate(type, data); // Load and customize the template

        const params = {
            Source: 'Artalyze Support <info@artalyze.app>', // Desired sender name
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

        console.log(`Sending email to ${to} with subject: ${subject}`);
        const result = await ses.sendEmail(params).promise();
        console.log("Email sent successfully:", result);
    } catch (error) {
        console.error("Error sending email:", error);
        throw error;
    }
};

module.exports = sendEmail;
