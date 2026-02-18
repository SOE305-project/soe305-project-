import 'dart:convert';
import 'package:http/http.dart' as http;

class SendGridService {
  static const String _apiKey = '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';
  static const String _fromEmail = 'obikachibuike15@gmail.com';
  static const String _endpoint = 'https://api.sendgrid.com/v3/mail/send';

  /// Sends an email using SendGrid's REST API.
  Future<bool> sendEmail({
    required String toEmail,
    required String subject,
    required String content,
  }) async {
    try {
      final response = await http.post(
        Uri.parse(_endpoint),
        headers: {
          'Authorization': 'Bearer $_apiKey',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'personalizations': [
            {
              'to': [
                {'email': toEmail}
              ],
              'subject': subject,
            }
          ],
          'from': {'email': _fromEmail},
          'content': [
            {
              'type': 'text/plain',
              'value': content,
            }
          ],
        }),
      );

      if (response.statusCode == 202) {
        print('✅ Email sent successfully to $toEmail');
        return true;
      } else {
        print('❌ Failed to send email via SendGrid: ${response.body}');
        return false;
      }
    } catch (e) {
      print('❌ Error sending email: $e');
      return false;
    }
  }
}
