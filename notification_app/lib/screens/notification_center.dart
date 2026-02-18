
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/notification_model.dart';
import '../services/firestore_notification_service.dart';
import '../services/notification_dispatcher.dart';
import '../widgets/notification_tile.dart';

class NotificationCenter extends StatefulWidget {
  final String userId;
  const NotificationCenter({super.key, required this.userId});

  @override
  State<NotificationCenter> createState() => _NotificationCenterState();
}

class _NotificationCenterState extends State<NotificationCenter> {
  final FirestoreNotificationService _service = FirestoreNotificationService();
  final NotificationDispatcher _dispatcher = NotificationDispatcher();

  void _showTestDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Test External Channels'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.email),
              title: const Text('Send Test Email'),
              onTap: () {
                _dispatcher.dispatch(
                    channel: 'email',
                    recipient: 'test@example.com',
                    content: 'This is a test email from Flutter Web!',
                    subject: 'Flutter Test');
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Triggered Email Send')));
              },
            ),
            ListTile(
              leading: const Icon(Icons.sms),
              title: const Text('Send Test SMS'),
              onTap: () {
                _dispatcher.dispatch(
                    channel: 'sms',
                    recipient: '+1234567890',
                    content: 'This is a test SMS from Flutter Web!');
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Triggered SMS Send')));
              },
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          IconButton(
            icon: const Icon(Icons.science),
            tooltip: 'Test Channels',
            onPressed: _showTestDialog,
          ),
        ],
      ),
      body: StreamBuilder<List<NotificationModel>>(
        stream: _service.getUserNotifications(widget.userId),
        builder: (context, snapshot) {
          if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          }

          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          final notifications = snapshot.data ?? [];

          if (notifications.isEmpty) {
            return const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.notifications_off, size: 64, color: Colors.grey),
                  SizedBox(height: 16),
                  Text('No notifications yet'),
                ],
              ),
            );
          }

          return ListView.separated(
            itemCount: notifications.length,
            separatorBuilder: (ctx, i) => const Divider(height: 1),
            itemBuilder: (context, index) {
              return NotificationTile(notification: notifications[index]);
            },
          );
        },
      ),
    );
  }
}
