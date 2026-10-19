
import 'package:flutter/foundation.dart';

class AppConfig {
  // Backend API URL (GitHub Codespaces)
  static const String apiBaseUrl =
      'https://fluffy-goldfish-q7g4pwqqj5jwcxj9q-3001.app.github.dev/api/v1';

  // Public settings endpoint
  static const String flutterConfigUrl =
      'https://fluffy-goldfish-q7g4pwqqj5jwcxj9q-3001.app.github.dev/api/v1/settings/public';

  // ML Server URL (chưa thay đổi, cần xác minh riêng)
  static const String mlBaseUrl =
      'https://minisocial-recomendation-system.onrender.com';

  // Local development URLs (chỉ dùng khi cần kiểm thử cục bộ)
  // static const String localApiBaseUrl = 'http://localhost:3001/api/v1';
  // static const String localMlBaseUrl = 'http://localhost:8000';

  static const String appName = 'MiniSocial';
  static const String appVersion = '1.0.5';
}
