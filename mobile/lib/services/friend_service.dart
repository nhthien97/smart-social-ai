// lib/services/friend_service.dart

import 'package:dio/dio.dart';
import 'api_service.dart';

class FriendService {
  final ApiService _api = ApiService();

  Future<Map<String, dynamic>> checkFriendship(String userId) async {
    try {
      final resp = await _api.get('/friends/check/$userId');
      return {'success': true, 'data': resp.data};
    } on DioException catch (e) {
      return {'success': false, 'message': _extractMessage(e)};
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  Future<Map<String, dynamic>> getFriends({int page = 1, int limit = 20}) async {
    try {
      final resp = await _api.get('/friends', queryParameters: {
        'page': page,
        'limit': limit,
      });
      return {'success': true, 'data': resp.data};
    } on DioException catch (e) {
      return {'success': false, 'message': _extractMessage(e)};
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  Future<Map<String, dynamic>> getRequests() async {
    try {
      final resp = await _api.get('/friends/requests');
      return {'success': true, 'data': resp.data};
    } on DioException catch (e) {
      return {'success': false, 'message': _extractMessage(e)};
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  Future<Map<String, dynamic>> getSuggestions({int page = 1, int limit = 20}) async {
    try {
      final resp = await _api.get('/friends/suggestions', queryParameters: {
        'page': page,
        'limit': limit,
      });
      return {'success': true, 'data': resp.data};
    } on DioException catch (e) {
      return {'success': false, 'message': _extractMessage(e)};
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  Future<Map<String, dynamic>> sendRequest(String toUserId) async {
    try {
      final resp = await _api.post('/friends/requests', data: {
        'to': toUserId,
      });
      return {'success': true, 'data': resp.data};
    } on DioException catch (e) {
      return {'success': false, 'message': _extractMessage(e)};
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  Future<Map<String, dynamic>> acceptRequest(String requestId) async {
    try {
      final resp = await _api.post('/friends/requests/$requestId/accept');
      // Some backends may use PUT or PATCH - adjust if necessary
      return {'success': true, 'data': resp.data};
    } on DioException catch (e) {
      return {'success': false, 'message': _extractMessage(e)};
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  Future<Map<String, dynamic>> rejectRequest(String requestId) async {
    try {
      final resp = await _api.post('/friends/requests/$requestId/reject');
      return {'success': true, 'data': resp.data};
    } on DioException catch (e) {
      return {'success': false, 'message': _extractMessage(e)};
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  Future<Map<String, dynamic>> getSentRequests() async {
    try {
      final resp = await _api.get('/friends/requests/sent');
      return {'success': true, 'data': resp.data};
    } on DioException catch (e) {
      return {'success': false, 'message': _extractMessage(e)};
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  Future<Map<String, dynamic>> cancelSentRequest(String requestId) async {
    try {
      final resp = await _api.delete('/friends/requests/$requestId/cancel');
      return {'success': true, 'data': resp.data};
    } on DioException catch (e) {
      return {'success': false, 'message': _extractMessage(e)};
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  Future<Map<String, dynamic>> removeFriend(String friendId) async {
    try {
      final resp = await _api.delete('/friends/$friendId');
      return {'success': true, 'data': resp.data};
    } on DioException catch (e) {
      return {'success': false, 'message': _extractMessage(e)};
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  String _extractMessage(DioException e) {
    try {
      if (e.response?.data != null && e.response?.data['message'] != null) {
        return e.response?.data['message'];
      }
    } catch (_) {}
    return e.message ?? 'Lỗi kết nối';
  }
}
