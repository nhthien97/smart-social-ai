// lib/firebase_options.dart
// Cấu hình Firebase cho từng platform
// Web config lấy từ Firebase Console → Project Settings → Your apps → Web

import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      return web;
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      default:
        throw UnsupportedError(
          'DefaultFirebaseOptions are not supported for this platform.',
        );
    }
  }

  // ===== WEB =====

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'AIzaSyDVdKdj3lL1vEnUIWKKYZJ8aV6N_GHqNS8',
    appId: '1:1056551949535:web:19eed13eb5b566c00ac56a',
    messagingSenderId: '1056551949535',
    projectId: 'smart-social-ai-3bb8c',
    authDomain: 'smart-social-ai-3bb8c.firebaseapp.com',
    storageBucket: 'smart-social-ai-3bb8c.firebasestorage.app',
  );
  // ===== ANDROID =====

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyA_owbyqqygIMfC9g_zjhgw4Q48rhKxqvc',
    appId: '1:1056551949535:android:d6555d7a19a83bf30ac56a',
    messagingSenderId: '1056551949535',
    projectId: 'smart-social-ai-3bb8c',
    storageBucket: 'smart-social-ai-3bb8c.firebasestorage.app',
  );
  // ===== iOS =====
  // TODO: Thêm config iOS nếu cần

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyDWruSaZWH04SG-7_jODTL5zh8VTQG9gbQ',
    appId: '1:1056551949535:ios:40c3dec9ab60e5080ac56a',
    messagingSenderId: '1056551949535',
    projectId: 'smart-social-ai-3bb8c',
    storageBucket: 'smart-social-ai-3bb8c.firebasestorage.app',
    iosBundleId: 'com.example.minisocialFlutter',
  );
}
