// lib/services/auth_service.dart

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../config/firebase_config.dart' show isFirebaseInitialized;
import 'api_service.dart';
import '../models/user_model.dart';

class AuthService {
  final ApiService _apiService = ApiService();

  // Set token cho ApiService
  void setToken(String token) {
    _apiService.setToken(token);
  }

  // Đăng nhập
  Future<Map<String, dynamic>> login(String identifier, String password) async {
    try {
      final response = await _apiService.post('/auth/login', data: {
        'identifier': identifier,
        'password': password,
      });

      final data = response.data;
      final accessToken = data['accessToken'];
      final user = UserModel.fromJson(data['user']);

      // Lưu token
      await _apiService.saveToken(accessToken);

      return {
        'success': true,
        'user': user,
        'token': accessToken,
      };
    } on DioException catch (e) {
      String message = 'Đăng nhập thất bại';
      if (e.response?.data != null && e.response?.data['message'] != null) {
        message = e.response?.data['message'];
      }
      return {
        'success': false,
        'message': message,
      };
    } catch (e) {
      return {
        'success': false,
        'message': 'Đã xảy ra lỗi: $e',
      };
    }
  }

  // Đăng ký
  Future<Map<String, dynamic>> register({
    required String email,
    required String username,
    required String fullName,
    required String password,
  }) async {
    try {
      await _apiService.post('/auth/register', data: {
        'email': email,
        'username': username,
        'full_name': fullName,
        'password': password,
      });

      return {
        'success': true,
        'message': 'Đăng ký thành công! Vui lòng đăng nhập.',
      };
    } on DioException catch (e) {
      String message = 'Đăng ký thất bại';
      if (e.response?.data != null && e.response?.data['message'] != null) {
        message = e.response?.data['message'];
      }
      return {
        'success': false,
        'message': message,
      };
    } catch (e) {
      return {
        'success': false,
        'message': 'Đã xảy ra lỗi: $e',
      };
    }
  }

  // Lấy thông tin user hiện tại (full profile)
  Future<Map<String, dynamic>> getMe() async {
    try {
      await _apiService.loadToken();
      final response = await _apiService.get('/users/profile');
      final user = UserModel.fromJson(response.data);

      return {
        'success': true,
        'user': user,
      };
    } on DioException catch (e) {
      String message = 'Không thể lấy thông tin người dùng';
      if (e.response?.statusCode == 401) {
        message = 'Phiên đăng nhập đã hết hạn';
      }
      return {
        'success': false,
        'message': message,
      };
    } catch (e) {
      return {
        'success': false,
        'message': 'Đã xảy ra lỗi: $e',
      };
    }
  }

  Future<void> signInFirebase() async {
    if (isFirebaseInitialized) {
    }
  }

  Future<void> signOutFirebase() async {
    if (isFirebaseInitialized) {
      try {
        await FirebaseAuth.instance.signOut();
      } catch (e) {
        if (kDebugMode) {
          print('Firebase sign out error: $e');
        }
      }
    }
  }

  // Đăng xuất
  Future<void> logout() async {
    await signOutFirebase();
    await _apiService.removeToken();
  }

  // Kiểm tra đã đăng nhập chưa
  Future<bool> isLoggedIn() async {
    await _apiService.loadToken();
    return _apiService.hasToken;
  }

  Future<Map<String, dynamic>> updateProfile(UserModel user) async {
    try {
      final sendData = {
        if (user.fullName != null && user.fullName!.isNotEmpty) 'full_name': user.fullName,
        if (user.bio != null && user.bio!.isNotEmpty) 'bio': user.bio,
        if (user.job != null && user.job!.isNotEmpty) 'job': user.job,
        if (user.location != null && user.location!.isNotEmpty) 'location': user.location,
        if (user.avatar != null && user.avatar!.isNotEmpty) 'avatar_url': user.avatar,
        if (user.cover != null && user.cover!.isNotEmpty) 'cover_url': user.cover,
        if (user.phone != null && user.phone!.isNotEmpty) 'phone': user.phone,
        if (user.gender != null && user.gender!.isNotEmpty) 'gender': user.gender,
        if (user.birthdate != null) 'birthdate': user.birthdate!.toIso8601String(),
      };
      
      final response = await _apiService.patch('/users/profile', data: sendData);
      final updatedUser = UserModel.fromJson(response.data);
      return {'success': true, 'user': updatedUser};
    } on DioException catch (e) {
      final status = e.response?.statusCode;
      final message = e.response?.data?['message'] ?? 'Lỗi server';
      return {'success': false, 'message': message};
    } catch (e) {
      return {'success': false, 'message': 'Lỗi: $e'};
    }
  }

  // Đổi mật khẩu
  Future<Map<String, dynamic>> changePassword(String oldPassword, String newPassword) async {
    try {
      // Ensure token loaded into ApiService so request contains Authorization header
      await _apiService.loadToken();
      final response = await _apiService.post('/users/change-password', data: {
        'old_password': oldPassword,
        'new_password': newPassword,
      });

      // Nếu backend trả ok (200)
      return {'success': true, 'message': 'Đổi mật khẩu thành công'};
    } on DioException catch (e) {
      String message = 'Đổi mật khẩu thất bại';
      if (e.response?.data != null && e.response?.data['message'] != null) {
        message = e.response?.data['message'];
      }
      return {'success': false, 'message': message};
    } catch (e) {
      return {'success': false, 'message': 'Đã xảy ra lỗi: $e'};
    }
  }
}
