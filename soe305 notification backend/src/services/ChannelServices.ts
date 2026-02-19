import axios from 'axios';

<<<<<<< HEAD
/**
 * Email Service using SendGrid API
 */
=======


// Validation check 

const isValidEmail = (email: string) =>
  typeof email === 'string' && email.trim().includes('@');

const normalizePhone = (phone: string) =>
  typeof phone === 'string' ? phone.replace(/\s+/g, '') : '';

const isValidPhone = (phone: string) => {
  const p = normalizePhone(phone);
  return p.length >= 10; // simple safe check (won’t block most Nigerian numbers)
};


/**
 * Email Service using SendGrid API
 */


>>>>>>> a6c426e93c1a0797ea0d8bdf9de32d8bff086737
export const EmailService = {
    async send(to: string, htmlContent: string, subject: string): Promise<boolean> {
        const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
        const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@yourdomain.com';
<<<<<<< HEAD

        if (!SENDGRID_API_KEY) {
            console.error('❌ SENDGRID_API_KEY not configured');
=======
         

        if (!SENDGRID_API_KEY) {
            console.error('SENDGRID_API_KEY not configured');
>>>>>>> a6c426e93c1a0797ea0d8bdf9de32d8bff086737
            return false;
        }

        try {
            const response = await axios.post(
                'https://api.sendgrid.com/v3/mail/send',
                {
                    personalizations: [
                        {
                            to: [{ email: to }],
                            subject: subject
                        }
                    ],
                    from: { email: FROM_EMAIL },
                    content: [
                        {
                            type: 'text/html',
                            value: htmlContent
                        }
                    ]
                },
                {
                    headers: {
                        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.status === 202) {
<<<<<<< HEAD
                console.log(`✅ Email sent to ${to}`);
                return true;
            } else {
                console.error(`❌ Failed to send email. Status: ${response.status}`);
                return false;
            }
        } catch (error: any) {
            console.error('❌ Error sending email:', error.response?.data || error.message);
=======
                console.log(`Email sent to ${to}`);
                return true;
            } else {
                console.error(`Failed to send email. Status: ${response.status}`);
                return false;
            }
        } catch (error: any) {
            console.error('Error sending email:', error.response?.data || error.message);
>>>>>>> a6c426e93c1a0797ea0d8bdf9de32d8bff086737
            return false;
        }
    }
};

/**
 * SMS Service using Termii API
 */
export const SmsService = {
    async send(to: string, message: string): Promise<boolean> {
        const TERMII_API_KEY = process.env.TERMII_API_KEY;
        const TERMII_SENDER_ID = process.env.TERMII_SENDER_ID || 'YourApp';

        if (!TERMII_API_KEY) {
<<<<<<< HEAD
            console.error('❌ TERMII_API_KEY not configured');
=======
            console.error('TERMII_API_KEY not configured');
>>>>>>> a6c426e93c1a0797ea0d8bdf9de32d8bff086737
            return false;
        }

        try {
            const response = await axios.post(
                'https://api.ng.termii.com/api/sms/send',
                {
                    to: to,
                    from: TERMII_SENDER_ID,
                    sms: message,
                    type: 'plain',
                    channel: 'dnd',
                    api_key: TERMII_API_KEY
                },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data.message_id) {
<<<<<<< HEAD
                console.log(`✅ SMS sent to ${to}`);
                return true;
            } else {
                console.error(`❌ Failed to send SMS:`, response.data);
                return false;
            }
        } catch (error: any) {
            console.error('❌ Error sending SMS:', error.response?.data || error.message);
=======
                console.log(`SMS sent to ${to}`);
                return true;
            } else {
                console.error(`Failed to send SMS:`, response.data);
                return false;
            }
        } catch (error: any) {
            console.error('Error sending SMS:', error.response?.data || error.message);
>>>>>>> a6c426e93c1a0797ea0d8bdf9de32d8bff086737
            return false;
        }
    }
};
<<<<<<< HEAD
=======


>>>>>>> a6c426e93c1a0797ea0d8bdf9de32d8bff086737
