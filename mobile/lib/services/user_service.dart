// lib/services/user_service.dart

import 'package:dio/dio.dart';
import 'api_service.dart';

class UserService {
  final ApiService _api = ApiService();

  /// Lấy hồ sơ công khai của người dùng theo ID (UC1.7)
  Future<Map<String, dynamic>> getPublicProfile(String userId) async {
    try {
      final resp = await _api.get('/users/$userId');
      return {'success': true, 'data': resp.data};
    } on DioException catch (e) {
      try {
        if (e.response?.data != null && e.response?.data['message'] != null) {
          final msg = e.response?.data['message'];
          return {'success': false, 'message': msg is List ? msg.join(', ') : msg.toString()};
        }
      } catch (_) {}
      return {'success': false, 'message': e.message ?? 'Lỗi kết nối'};
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }
}
