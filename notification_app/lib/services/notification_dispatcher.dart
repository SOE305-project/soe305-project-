import 'dart:async';
import 'dart:math';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'sendgrid_service.dart';
import 'sms_service_termii.dart';
import '../models/notification_model.dart';

class NotificationDispatcher {
  final FirebaseFirestore _db = FirebaseFirestore.instance;
  final SendGridService _sendGrid = SendGridService();
  final SmsServiceTermii _smsService = SmsServiceTermii();
  final String _processorId = 'device_${Random().nextInt(10000)}'; // Unique ID for this active session

  StreamSubscription<QuerySnapshot>? _subscription;

  void startListening(String userId) {
    if (userId.isEmpty) return;

    print('🎧 Dispatcher ($_processorId): Active for User: $userId');

    // Listen for PENDING notifications
    _subscription = _db
        .collection('notifications')
        .where('userId', 'isEqualTo': userId)
        .where('status', 'isEqualTo': 'pending')
        .snapshots()
        .listen((snapshot) async {
      for (var doc in snapshot.docs) {
        await _processDocument(doc);
      }
    });
  }

  Future<void> _processDocument(DocumentSnapshot doc) async {
    // 🔒 TRANSACTION: Try to lock the document
    bool locked = await _tryLockDocument(doc.reference);
    if (!locked) return; // Another device picked it up

    try {
      NotificationModel notification = NotificationModel.fromFirestore(doc);
      
      List<String> failedChannels = [];
      
      // 1. Email
      if (notification.channel.contains('email')) {
         bool success = await _processEmail(notification);
         if (!success) failedChannels.add('email');
      }

      // 2. SMS
      if (notification.channel.contains('sms')) {
         bool success = await _processSms(notification);
         if (!success) failedChannels.add('sms');
      }

      // 3. Update Final Status
      if (failedChannels.isEmpty) {
        await doc.reference.update({
          'status': 'sent',
          'sentAt': FieldValue.serverTimestamp(),
          'processedBy': _processorId,
        });
      } else {
        await doc.reference.update({
          'status': 'failed',
          'error': 'Failed: $failedChannels',
          'processedBy': _processorId,
        });
      }

    } catch (e) {
      print('❌ Error processing ${doc.id}: $e');
      // Release lock so it can be retried? Or mark failed?
      // Mark failed to avoid infinite loop
      await doc.reference.update({'status': 'failed_exception', 'error': e.toString()});
    }
  }

  /// Attempts to update status from 'pending' to 'processing' atomically.
  Future<bool> _tryLockDocument(DocumentReference ref) async {
    try {
      return await _db.runTransaction((transaction) async {
        DocumentSnapshot freshSnap = await transaction.get(ref);
        if (!freshSnap.exists) return false;
        
        // precise check
        String status = freshSnap.get('status') ?? 'unknown';
        if (status != 'pending') {
          return false; // Already taken
        }

        transaction.update(ref, {
          'status': 'processing',
          'processorId': _processorId,
          'processingStartedAt': FieldValue.serverTimestamp(),
        });
        return true;
      });
    } catch (e) {
      // Transaction failed (contention)
      return false;
    }
  }

  void stopListening() {
    _subscription?.cancel();
  }

  Future<bool> _processEmail(NotificationModel notification) async {
    String subject = _getSubject(notification.type);
    String body = _getEmailBody(notification.type, notification.metadata);
    String? userEmail = notification.metadata['email'];
    
    // Safety check
    if (userEmail == null || userEmail.isEmpty) return false;

    return await _sendGrid.sendEmail(
      toEmail: userEmail,
      subject: subject,
      content: body,
    );
  }

  Future<bool> _processSms(NotificationModel notification) async {
    String body = _getSmsBody(notification.type, notification.metadata);
    String? phone = notification.metadata['phoneNumber'];
    
    if (phone == null || phone.isEmpty) return false;

    return await _smsService.sendSms(toPhone: phone, message: body);
  }

  // --- TEMPLATES (Same as before) ---
  String _getSubject(String type) {
    if (type == 'PAYMENT_SUCCESS') return 'Receipt: Payment Successful';
    if (type == 'BOOKING_CONFIRMED') return 'Booking Confirmation';
    if (type == 'RESERVATION_CANCELLED') return 'Reservation Cancelled';
    if (type == 'RESERVATION_EXPIRED') return 'Reservation Expired';
    if (type == 'PASSWORD_CREATED') return 'Account Created';
    return 'Notification';
  }

   String _getEmailBody(String type, Map<String, dynamic> metadata) {
    switch (type) {
      case 'PAYMENT_SUCCESS':
        return "Your payment of NGN ${metadata['amount']} was successful. Ref: ${metadata['reference']}";
      case 'BOOKING_CONFIRMED':
        return "Your reservation for ${metadata['hostelName']} (Room ${metadata['roomNumber']}) has been confirmed.";
      case 'RESERVATION_CANCELLED':
        return "Your reservation has been cancelled.";
      case 'RESERVATION_EXPIRED':
        return "Your reservation time has expired.";
      case 'PASSWORD_CREATED':
         return "Welcome to Hostel Management. Your account is ready.";
      default:
        return "You have a new message: ${metadata['message'] ?? ''}";
    }
  }

  String _getSmsBody(String type, Map<String, dynamic> metadata) {
    return _getEmailBody(type, metadata); // Reuse for now, keep it simple
  }
}
