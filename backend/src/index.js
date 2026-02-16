// Load environment variables
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const sgMail = require("@sendgrid/mail");

// ---------------- FIREBASE SETUP ----------------
const serviceAccount = require("../keys/serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// ---------------- SENDGRID SETUP ----------------
if (!process.env.SENDGRID_API_KEY) {
  console.warn(" SENDGRID_API_KEY is missing");
} else {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

async function sendEmailSendGrid(to, subject, text) {
  if (!process.env.SENDGRID_FROM) {
    throw new Error("Missing SENDGRID_FROM in .env");
  }

  await sgMail.send({
    to,
    from: process.env.SENDGRID_FROM,
    subject,
    text,
  });
}

// ---------------- EXPRESS SETUP ----------------
const app = express();
app.use(cors());
app.use(express.json());


// ---------------- EMAIL TEMPLATES ----------------
function getEmailTemplate(event, name = "User", data = {}) {
  const date = new Date().toDateString();

  switch (event) {
    case "PAYMENT_SUCCESS":
      return `Hello ${name},

Your payment was successful 

Booking Details:
• Status: Payment Confirmed
• Reference: ${event}
• Date: ${date}

You can now proceed with your hostel check-in via the app.

Thank you for choosing us.
— Hostel Booking App Team
`;

          case "PASSWORD_RESET":
      return `Hello ${name},

We received a request to reset your password.

Reset link:
${data.resetLink || "Reset link will be provided by Auth"}

If you did not request this, please ignore this email.

— Hostel Booking App Team
`;

    case "EMAIL_VERIFICATION":
      return `Hello ${name},

Welcome to the Hostel Booking App 

Please verify your email using this link:
${data.verifyLink || "Verification link will be provided by Auth"}

Once verified, you can proceed to book a hostel room.

— Hostel Booking App Team
`;


    case "PAYMENT_FAILED":
      return `Hello ${name},

Unfortunately, your payment attempt was not successful 

Please try again or use a different payment method.

If the issue persists, contact support via the Hostel Booking App.

— Hostel Booking App Team
`;

    case "BOOKING_CREATED": {
      const bookingId = data.bookingId || data.booking?.id || "N/A";
      const room = data.room || data.booking?.room || "Not assigned";
      const checkIn = data.checkIn || data.booking?.checkIn || "TBA";
      const checkOut = data.checkOut || data.booking?.checkOut || "TBA";

      return `Hello ${name},

Your room has been successfully booked 

Booking Details:
• Booking ID: ${bookingId}
• Room: ${room}
• Check-in: ${checkIn}
• Check-out: ${checkOut}
• Date: ${date}

You can view your booking in the Hostel Booking App.

— Hostel Booking App Team
`;
    }
    

    case "BOOKING_CANCELLED": {
      const bookingId = data.bookingId || data.booking?.id || "N/A";

      return `Hello ${name},

Your hostel booking has been cancelled 

Booking Details:
• Booking ID: ${bookingId}
• Date: ${date}

If this was not intended, please log in to the app and make a new booking.

— Hostel Booking App Team
`;
    }


    case "CHECK_IN_REMINDER":
      return `Hello ${name},

This is a reminder that your hostel check-in date is approaching 

Please ensure you have completed all required steps before arrival.

Safe travels!
— Hostel Booking App Team
`;

    default:
      return `Hello ${name},

You have a new notification from the Hostel Booking App.

— Hostel Booking App Team
`;
  }
}



// ---------------- ROUTES ----------------

// Health check
app.get("/", (req, res) => {
  res.send("Notifications backend is running");
});

app.post("/retry/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const ref = db.collection("notifications").doc(id);
    const snap = await ref.get();

    if (!snap.exists) return res.status(404).json({ status: "error", error: "Not found" });

    const n = snap.data();
    if (n.channel !== "email") return res.status(400).json({ status: "error", error: "Retry only supports email for now" });
    if (!n.email) return res.status(400).json({ status: "error", error: "Missing email" });

    await sendEmailSendGrid(n.email, `Hostel App: ${n.event}`, n.message);

    await ref.update({
      status: "sent",
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      lastAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
      attempts: admin.firestore.FieldValue.increment(1),
      errorMessage: admin.firestore.FieldValue.delete(),
      failedAt: admin.firestore.FieldValue.delete(),
      nextRetryAt: admin.firestore.FieldValue.delete(),
    });

    res.json({ status: "ok", id, retried: true });
  } catch (err) {
    res.status(500).json({ status: "error", error: err.message });
  }
});

// Create notification + send email if needed
app.post("/notify", async (req, res) => {
  try {
    const { event, channel, user, message, data } = req.body;
    const userName = user?.name || user?.fullName || "User";

    if (!event || !user?.id || !message) {
      return res.status(400).json({
        status: "error",
        error: "Missing required fields",
      });
    }

    const notification = {
      event,
      userId: user.id,
      email: user.email || null,
      phone: user.phone || null,
      message,
      meta: data || {},
      channel: (channel || "in_app").toLowerCase(),
      status: "pending",
      attempts: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Save notification first (backup)
    const ref = await db.collection("notifications").add(notification);

    // Try delivery
    try {
      if (notification.channel === "email") {
        if (!notification.email) {
          throw new Error("User email missing");
        }
      
      const emailBody = getEmailTemplate(notification.event, userName, data);

await sendEmailSendGrid(
  notification.email,
  `Hostel App Notification`,
  emailBody
);

      }

      // Mark as sent
      await ref.update({
        status: "sent",
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        lastAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
        attempts: admin.firestore.FieldValue.increment(1),
      });

      return res.json({
        status: "ok",
        id: ref.id,
        sent: true,
      });
    } catch (sendErr) {
      // Mark as failed
      await ref.update({
        status: "failed",
        attempts: admin.firestore.FieldValue.increment(1),
        errorMessage: sendErr.message,
        failedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
        nextRetryAt: admin.firestore.Timestamp.fromDate(
            new Date(Date.now() + 5 * 60 * 1000)
        ),  // Retry after 5 minutes
      });

      return res.status(500).json({
        status: "error",
        id: ref.id,
        error: sendErr.message,
      });
    }
  } catch (err) {
    return res.status(500).json({
      status: "error",
      error: err.message,
    });
  }
});

// Fetch notifications for Flutter UI
app.get("/notifications/:userId", async (req, res) => {
  try {
    const snap = await db
      .collection("notifications")
      .where("userId", "==", req.params.userId)
      .orderBy("createdAt", "desc")
      .get();

    const data = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(data);
  } catch (err) {
    res.status(500).json({
      status: "error",
      error: err.message,
    });
  }
});



// Preview email template without sending
app.post("/preview-email", (req, res) => {
  const { event, user = {}, data = {} } = req.body;

  const userName =
    user.name || user.fullName || "User";

  const preview = getEmailTemplate(event, userName, data);

  res.json({
    event,
    preview,
  });
});




// ---------------- START SERVER ----------------
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});













// // Load environment variables
// require("dotenv").config();

// const express = require("express");
// const cors = require("cors");
// const admin = require("firebase-admin");
// const sgMail = require("@sendgrid/mail");

// // ---------------- FIREBASE SETUP ----------------
// const serviceAccount = require("../keys/serviceAccountKey.json");

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
// });

// const db = admin.firestore();

// // ---------------- SENDGRID SETUP ----------------
// if (!process.env.SENDGRID_API_KEY) {
//   console.warn(" SENDGRID_API_KEY is missing");
// } else {
//   sgMail.setApiKey(process.env.SENDGRID_API_KEY);
// }

// async function sendEmailSendGrid(to, subject, text) {
//   if (!process.env.SENDGRID_FROM) {
//     throw new Error("Missing SENDGRID_FROM in .env");
//   }

//   await sgMail.send({
//     to,
//     from: process.env.SENDGRID_FROM,
//     subject,
//     text,
//   });
// }

// // ---------------- EXPRESS SETUP ----------------
// const app = express();
// app.use(cors());
// app.use(express.json());


// // ---------------- EMAIL TEMPLATES ----------------
// function getEmailTemplate(event, name = "User", data = {}) {
//   const date = new Date().toDateString();

//   switch (event) {
//     case "PAYMENT_SUCCESS":
//       return `Hello ${name},

// Your payment was successful 

// Booking Details:
// • Status: Payment Confirmed
// • Reference: ${event}
// • Date: ${date}

// You can now proceed with your hostel check-in via the app.

// Thank you for choosing us.
// — Hostel Booking App Team
// `;

//           case "PASSWORD_RESET":
//       return `Hello ${name},

// We received a request to reset your password.

// Reset link:
// ${data.resetLink || "Reset link will be provided by Auth"}

// If you did not request this, please ignore this email.

// — Hostel Booking App Team
// `;

//     case "EMAIL_VERIFICATION":
//       return `Hello ${name},

// Welcome to the Hostel Booking App 

// Please verify your email using this link:
// ${data.verifyLink || "Verification link will be provided by Auth"}

// Once verified, you can proceed to book a hostel room.

// — Hostel Booking App Team
// `;


//     case "PAYMENT_FAILED":
//       return `Hello ${name},

// Unfortunately, your payment attempt was not successful 

// Please try again or use a different payment method.

// If the issue persists, contact support via the Hostel Booking App.

// — Hostel Booking App Team
// `;

//     case "BOOKING_CREATED": {
//       const bookingId = data.bookingId || data.booking?.id || "N/A";
//       const room = data.room || data.booking?.room || "Not assigned";
//       const checkIn = data.checkIn || data.booking?.checkIn || "TBA";
//       const checkOut = data.checkOut || data.booking?.checkOut || "TBA";

//       return `Hello ${name},

// Your room has been successfully booked 

// Booking Details:
// • Booking ID: ${bookingId}
// • Room: ${room}
// • Check-in: ${checkIn}
// • Check-out: ${checkOut}
// • Date: ${date}

// You can view your booking in the Hostel Booking App.

// — Hostel Booking App Team
// `;
//     }
    

//     case "BOOKING_CANCELLED": {
//       const bookingId = data.bookingId || data.booking?.id || "N/A";

//       return `Hello ${name},

// Your hostel booking has been cancelled 

// Booking Details:
// • Booking ID: ${bookingId}
// • Date: ${date}

// If this was not intended, please log in to the app and make a new booking.

// — Hostel Booking App Team
// `;
//     }


//     case "CHECK_IN_REMINDER":
//       return `Hello ${name},

// This is a reminder that your hostel check-in date is approaching 

// Please ensure you have completed all required steps before arrival.

// Safe travels!
// — Hostel Booking App Team
// `;

//     default:
//       return `Hello ${name},

// You have a new notification from the Hostel Booking App.

// — Hostel Booking App Team
// `;
//   }
// }



// // ---------------- ROUTES ----------------

// // Health check
// app.get("/", (req, res) => {
//   res.send("Notifications backend is running");
// });

// app.post("/retry/:id", async (req, res) => {
//   try {
//     const { id } = req.params;
//     const ref = db.collection("notifications").doc(id);
//     const snap = await ref.get();

//     if (!snap.exists) return res.status(404).json({ status: "error", error: "Not found" });

//     const n = snap.data();
//     if (n.channel !== "email") return res.status(400).json({ status: "error", error: "Retry only supports email for now" });
//     if (!n.email) return res.status(400).json({ status: "error", error: "Missing email" });

//     await sendEmailSendGrid(n.email, `Hostel App: ${n.event}`, n.message);

//     await ref.update({
//       status: "sent",
//       sentAt: admin.firestore.FieldValue.serverTimestamp(),
//       lastAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
//       attempts: admin.firestore.FieldValue.increment(1),
//       errorMessage: admin.firestore.FieldValue.delete(),
//       failedAt: admin.firestore.FieldValue.delete(),
//       nextRetryAt: admin.firestore.FieldValue.delete(),
//     });

//     res.json({ status: "ok", id, retried: true });
//   } catch (err) {
//     res.status(500).json({ status: "error", error: err.message });
//   }
// });

// // Create notification + send email if needed
// app.post("/notify", async (req, res) => {
//   try {
//     const { event, channel, user, message, data } = req.body;
//     const userName = user?.name || user?.fullName || "User";

//     if (!event || !user?.id || !message) {
//       return res.status(400).json({
//         status: "error",
//         error: "Missing required fields",
//       });
//     }

//     const notification = {
//       event,
//       userId: user.id,
//       email: user.email || null,
//       phone: user.phone || null,
//       message,
//       meta: data || {},
//       channel: (channel || "in_app").toLowerCase(),
//       status: "pending",
//       attempts: 0,
//       createdAt: admin.firestore.FieldValue.serverTimestamp(),
//     };

//     // Save notification first (backup)
//     const ref = await db.collection("notifications").add(notification);

//     // Try delivery
//     try {
//       if (notification.channel === "email") {
//         if (!notification.email) {
//           throw new Error("User email missing");
//         }
      
//       const emailBody = getEmailTemplate(notification.event, userName, data);

// await sendEmailSendGrid(
//   notification.email,
//   `Hostel App Notification`,
//   emailBody
// );

//       }

//       // Mark as sent
//       await ref.update({
//         status: "sent",
//         sentAt: admin.firestore.FieldValue.serverTimestamp(),
//         lastAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
//         attempts: admin.firestore.FieldValue.increment(1),
//       });

//       return res.json({
//         status: "ok",
//         id: ref.id,
//         sent: true,
//       });
//     } catch (sendErr) {
//       // Mark as failed
//       await ref.update({
//         status: "failed",
//         attempts: admin.firestore.FieldValue.increment(1),
//         errorMessage: sendErr.message,
//         failedAt: admin.firestore.FieldValue.serverTimestamp(),
//         lastAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
//         nextRetryAt: admin.firestore.Timestamp.fromDate(
//             new Date(Date.now() + 5 * 60 * 1000)
//         ),  // Retry after 5 minutes
//       });

//       return res.status(500).json({
//         status: "error",
//         id: ref.id,
//         error: sendErr.message,
//       });
//     }
//   } catch (err) {
//     return res.status(500).json({
//       status: "error",
//       error: err.message,
//     });
//   }
// });

// // Fetch notifications for Flutter UI
// app.get("/notifications/:userId", async (req, res) => {
//   try {
//     const snap = await db
//       .collection("notifications")
//       .where("userId", "==", req.params.userId)
//       .orderBy("createdAt", "desc")
//       .get();

//     const data = snap.docs.map((doc) => ({
//       id: doc.id,
//       ...doc.data(),
//     }));

//     res.json(data);
//   } catch (err) {
//     res.status(500).json({
//       status: "error",
//       error: err.message,
//     });
//   }
// });



// // Preview email template without sending
// app.post("/preview-email", (req, res) => {
//   const { event, user = {}, data = {} } = req.body;

//   const userName =
//     user.name || user.fullName || "User";

//   const preview = getEmailTemplate(event, userName, data);

//   res.json({
//     event,
//     preview,
//   });
// });




// // ---------------- START SERVER ----------------
// const PORT = process.env.PORT || 4000;
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });
