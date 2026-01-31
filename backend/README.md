NOTIFICATION FOR GROUP 5

This codes:

1.Sends email notifications
2.Stores in-app notifications
3.Tracks delivery status (pending, sent, failed)
4.Exposes APIs for the frontend to fetch notifications
5.Provides a preview mode for testing templates

Supported Notification Events

-Account creation
-Room booking
-Payment success
-Payment failure
-Booking cancellation
-Check-in reminders

Tech Stack

.Node.js
.Firebase Firestore
.SendGrid (Email API)
.dotenv


Project Structure
backend/
├── src/
│   └── index.js
├── keys/
│   └── serviceAccountKey.json
├── .env
├── package.json
└── README.md


Email Templates

Email content is generated using predefined templates based on the event type.

Templates:

1.Payment Success
2.Payment Failed
3.Booking Created
4.Booking Cancelled
5.Check-in Reminder

Templates support optional fields such as user name and booking details.
If a field is missing, a safe fallback value is used.

1.Reliability & Backup
2.All notifications are saved in Firestore before delivery
3.Delivery status is tracked (pending, sent, failed)
4.Failed notifications store error messages
5.Retry logic is supported
6.This ensures no notification is lost.

Integration with Other Teams

1.Auth module provides user data (id, name, email)
2.Booking and Payment modules trigger events
3.Flutter frontend fetches notifications via REST API
4.The service does not depend directly on other modules’ databases.

Testing

Notifications were tested using:

1.curl commands
2.Email delivery verification
3.Firestore data inspection
4.Template preview endpoint
5.Notes on Email Spam

Emails may appear in spam folders due to:

1.Free email domain usage
2.New SendGrid account
3.No custom domain authentication

This does not affect functionality and is acceptable for academic demonstration.

Course Information

Course: SOE 305 – Software Engineering
Module: Notifications
Project: Hostel Booking Application




SMS Delivery – Notifications Service
Purpose

This document guides the implementation of SMS notifications for the Hostel Booking App Notifications Service.

The backend already supports:

Notification storage (Firestore)

Status tracking (pending, sent, failed)

Retry logic

Email delivery (SendGrid)

Your task is to plug in SMS delivery following the same pattern.

Recommended SMS Providers

Choose ONE:

Termii (recommended – Nigeria-friendly)

Twilio

Expected Notification Payload

SMS notifications are triggered via the existing endpoint:

POST /notify


Example payload:

{
  "event": "PAYMENT_SUCCESS",
  "channel": "sms",
  "user": {
    "id": "u1",
    "phone": "08012345678"
  },
  "message": "Payment successful. Your booking is confirmed."
}

Implementation Guidelines
 Detect SMS channel

Inside the /notify route:

if (notification.channel === "sms") {
  // send SMS here
}


Send SMS via provider API

Use the provider’s REST API

Send notification.message to notification.phone

Do NOT hardcode credentials

Load API keys from .env

Example .env keys:

TERMII_API_KEY=xxxx
TERMII_SENDER_ID=HostelApp

 Update notification status

Follow the same logic as email:

On success:
status: "sent"

On failure:
status: "failed"
errorMessage: "<provider error>"
attempts: +1

Firestore Fields (Already Supported)

Each SMS notification document should include:

channel: "sms"

status

attempts

lastAttemptAt

nextRetryAt (optional)

No schema changes are required.

Testing

Use curl or Postman to send test payloads

Confirm:

SMS is delivered

Firestore status updates correctly

If provider blocks delivery, status should be failed with error logged

Important Notes

SMS logic should not affect email or in-app notifications

Retry endpoint (POST /retry/:id) can later be extended for SMS

Keep implementation minimal and consistent with email logic

Done When:

SMS notifications send successfully

Failed SMS attempts are logged

Backend does not crash on missing phone numbers

Code follows existing notification structure




Feel Free To Change The README to your taste
