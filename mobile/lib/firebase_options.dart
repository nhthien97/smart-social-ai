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
    apiKey: 'AIzaSyAu5iOoEgtYviT2vsl0Dpr2bxvJRrqqQvA',
    appId: '1:60225260078:web:f549668a3b77e624d9edbf',
    messagingSenderId: '60225260078',
    projectId: 'minisocial-52902',
    authDomain: 'minisocial-52902.firebaseapp.com',
    databaseURL: 'https://minisocial-52902-default-rtdb.firebaseio.com',
    storageBucket: 'minisocial-52902.firebasestorage.app',
    measurementId: 'G-746R52KLWR',
  );

  // ===== ANDROID =====
  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyBZlwKlezrAmmYHw0StyIfrpXJy1pzYiOk',
    appId: '1:60225260078:android:9bd075e7d129e16cd9edbf',
    messagingSenderId: '60225260078',
    projectId: 'minisocial-52902',
    storageBucket: 'minisocial-52902.firebasestorage.app',
  );

  // ===== iOS =====
  // TODO: Thêm config iOS nếu cần
  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'YOUR_IOS_API_KEY',
    appId: 'YOUR_IOS_APP_ID',
    messagingSenderId: '60225260078',
    projectId: 'minisocial-52902',
    storageBucket: 'minisocial-52902.firebasestorage.app',
    iosBundleId: 'com.example.minisocialFlutter',
  );
}
