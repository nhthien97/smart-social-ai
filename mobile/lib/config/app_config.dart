// lib/config/app_config.dart

import 'package:flutter/foundation.dart';

class AppConfig {
  // API Base URL (Render) - bật lại khi push code

  static const String apiBaseUrl =
    'https://orange-space-lamp-jjw7qx55vpgw2q4px-3001.app.github.dev/api/v1';

  // API Base URL (Local) - để test xem log

  // static const String apiBaseUrl = 'http://localhost:3001/api/v1';

  // Public settings endpoint (fallback config source)
  static const String flutterConfigUrl = 'https://orange-space-lamp-jjw7qx55vpgw2q4px-3001.app.github.dev/api/v1/settings/public';

  // ML Server URL (recommendation system)
  static const String mlBaseUrl = 'https://minisocial-recomendation-system.onrender.com';

  // static const String mlBaseUrl = 'http://localhost:8000';

  static const String appName = 'MiniSocial';
  static const String appVersion = '1.0.5';
}
