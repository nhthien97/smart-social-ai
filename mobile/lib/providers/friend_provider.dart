// lib/providers/friend_provider.dart

import 'package:flutter/material.dart';
import '../services/friend_service.dart';

class FriendProvider with ChangeNotifier {
  final FriendService _service = FriendService();

  int _pendingCount = 0;
  int get pendingCount => _pendingCount;

  void setPendingCount(int count) {
    if (_pendingCount != count) {
      _pendingCount = count;
      notifyListeners();
    }
  }

  Future<void> fetchPendingCount() async {
    try {
      final result = await _service.getRequests();
      if (result['success'] == true && result['data'] is List) {
        _pendingCount = (result['data'] as List).length;
        notifyListeners();
      }
    } catch (_) {}
  }
}
