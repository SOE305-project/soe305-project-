const express = require('express');
const app = express();
app.use(express.json());

const emailService = require('./backend/email.service');

app.get('/', (req, res) => {
    res.send('Backend working locally!');
});

// Test sending email
app.get('/test-email', async (req, res) => {
    try {
        await emailService.sendTestEmail();
        res.send('Email sent successfully!');
    } catch (err) {
        res.status(500).send('Email failed: ' + err.message);
    }
});

app.listen(3000, () => console.log('Server running on port 3000'));

