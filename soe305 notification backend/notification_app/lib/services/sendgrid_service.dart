import 'dart:convert';
import 'package:http/http.dart' as http;

class SendGridService {
  // ✅ This is now YOUR BACKEND endpoint (not SendGrid)
  // Put your deployed backend URL here when ready.
  // For local testing (same laptop): http://localhost:4000/notify
  
  // NOTE: For Android Emulator use http://10.0.2.2:4000/notify
  static const String _backendNotifyUrl = 'http://localhost:3000/notify'; 

  /// Keeps same method name + parameters so existing code won't break.
  /// It no longer sends directly to SendGrid.
  /// It calls the backend, which sends the email securely.
  Future<bool> sendEmail({
    required String toEmail,
    required String subject,
    required String content,
  }) async {
    try {
      final response = await http.post(
        Uri.parse(_backendNotifyUrl),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
            // Adjusting payload to match likely backend expectations
            // You might need to update your backend to handle "EMAIL_GENERIC" or similar
          "type": "email", 
          "channel": "email",
          "recipients": [toEmail],
          "subject": subject,
          "message": content,
          "data": {
            "subject": subject
          }
        }),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        print('✅ Backend accepted email request for $toEmail');
        return true;
      } else {
        print('❌ Backend rejected request: ${response.statusCode} ${response.body}');
        return false;
      }
    } catch (e) {
      print('❌ Error calling backend: $e');
      return false;
    }
  }
}
