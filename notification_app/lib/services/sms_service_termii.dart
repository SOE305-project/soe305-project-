
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_dotenv/flutter_dotenv.dart';

class SmsServiceTermii {
  static const String _baseUrl = 'https://api.ng.termii.com/api/sms/send';

  Future<bool> sendSms({
    required String toPhone,
    required String message,
  }) async {
    final apiKey = dotenv.env['TERMII_API_KEY'];
    if (apiKey == null || apiKey.isEmpty) {
      print('❌ Termii API Key missing');
      return false;
    }

    try {
      final response = await http.post(
        Uri.parse(_baseUrl),
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'to': toPhone,
          'from': 'N-Alert', // Or your Sender ID
          'sms': message,
          'type': 'plain',
          'channel': 'generic', // 'dnd' for verified numbers
          'api_key': apiKey,
        }),
      );

      if (response.statusCode == 200) {
        print('✅ SMS sent via Termii!');
        return true;
      } else {
        print('❌ Termii Error: ${response.body}');
        return false;
      }
    } catch (e) {
      print('❌ SMS Exception: $e');
      return false;
    }
  }
}
