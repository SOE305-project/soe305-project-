 const nodemailer = require('nodemailer');

const sendTestEmail = async () => {
    // Create a test account
    let testAccount = await nodemailer.createTestAccount();

    // Create a transporter
    let transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: {
            user: testAccount.user,
            pass: testAccount.pass
        }
    });

    // Email message
    let info = await transporter.sendMail({
        from: '"Test App" <test@example.com>',
        to: 'someone@example.com',
        subject: 'Hello from backend!',
        text: 'This is a test email',
        html: '<b>This is a test email</b>'
    });

    console.log('Message sent: %s', info.messageId);
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
};

module.exports = { sendTestEmail };
