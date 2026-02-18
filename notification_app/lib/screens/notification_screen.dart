import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/notification_model.dart';
import '../services/notification_dispatcher.dart';
// Note: In a real app, you'd use a Provider for the dispatcher

class NotificationScreen extends StatefulWidget {
  final String userId;

  const NotificationScreen({super.key, required this.userId});

  @override
  State<NotificationScreen> createState() => _NotificationScreenState();
}

class _NotificationScreenState extends State<NotificationScreen> {
  final NotificationDispatcher _dispatcher = NotificationDispatcher();
  
  @override
  void initState() {
    super.initState();
    // Start listening for client-side automation
    _dispatcher.startListening(widget.userId);
  }

  @override
  void dispose() {
    _dispatcher.stopListening();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        centerTitle: true,
      ),
      body: StreamBuilder<QuerySnapshot>(
        stream: FirebaseFirestore.instance
            .collection('notifications')
            .where('userId', 'isEqualTo': widget.userId)
            .orderBy('createdAt', descending: true)
            .snapshots(),
        builder: (context, snapshot) {
          if (snapshot.hasError) {
             return Center(child: Text('Error: ${snapshot.error}'));
          }
          
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          final docs = snapshot.data?.docs ?? [];

          if (docs.isEmpty) {
            return const Center(child: Text('No notifications yet.'));
          }

          return ListView.builder(
            itemCount: docs.length,
            itemBuilder: (context, index) {
              final model = NotificationModel.fromFirestore(docs[index]);
              return _buildNotificationTile(model);
            },
          );
        },
      ),
    );
  }

  Widget _buildNotificationTile(NotificationModel n) {
    IconData icon;
    Color color;

    switch (n.type) {
      case 'PAYMENT_SUCCESS':
        icon = Icons.check_circle;
        color = Colors.green;
        break;
      case 'BOOKING_CONFIRMED':
        icon = Icons.hotel;
        color = Colors.blue;
        break;
      case 'RESERVATION_CANCELLED':
        icon = Icons.cancel;
        color = Colors.red;
        break;
      case 'RESERVATION_EXPIRED':
        icon = Icons.timer_off;
        color = Colors.orange;
        break;
      default:
        icon = Icons.notifications;
        color = Colors.grey;
    }

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: color.withOpacity(0.1),
          child: Icon(icon, color: color),
        ),
        title: Text(n.title, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(n.message),
            const SizedBox(height: 4),
            Row(
              children: [
                if (n.status == 'sent') 
                  const Icon(Icons.mark_email_read, size: 14, color: Colors.green),
                 if (n.status == 'sent') 
                  const SizedBox(width: 4),
                Text(
                  n.status.toUpperCase(),
                  style: TextStyle(
                    fontSize: 10,
                    color: n.status == 'sent' ? Colors.green : Colors.grey,
                  ),
                ),
              ],
            )
          ],
        ),
        isThreeLine: true,
      ),
    );
  }
}
