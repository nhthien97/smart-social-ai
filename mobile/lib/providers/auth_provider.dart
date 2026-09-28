// lib/providers/auth_provider.dart

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import '../models/user_model.dart';
import '../services/auth_service.dart';
import '../services/api_service.dart';
import '../services/secure_storage_service.dart';

enum AuthStatus {
  initial,
  loading,
  authenticated,
  unauthenticated,
}

class AuthProvider with ChangeNotifier {
  final AuthService _authService = AuthService();

  AuthStatus _status = AuthStatus.initial;
  UserModel? _user;
  String? _token;
  String? _errorMessage;

  // Getters
  AuthStatus get status => _status;
  UserModel? get user => _user;
  String? get token => _token;
  String? get errorMessage => _errorMessage;
  bool get isAuthenticated => _status == AuthStatus.authenticated;
  bool get isLoading => _status == AuthStatus.loading;

  // Constructor - kiểm tra trạng thái đăng nhập
  AuthProvider() {
    checkAuthStatus();
  }

  // Kiểm tra trạng thái đăng nhập khi khởi động app
  Future<void> checkAuthStatus() async {
    _status = AuthStatus.loading;
    notifyListeners();

    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('auth_token');
      final userJson = prefs.getString('user_data');

      // Ưu tiên load user từ local trước
      if (userJson != null) {
        _user = UserModel.fromJson(jsonDecode(userJson));
      }

      if (token != null && userJson != null) {
        _token = token;

        // Lấy dữ liệu mới từ API (full profile)
        final result = await _authService.getMe();
        if (result['success']) {
          final apiUser = result['user'] as UserModel;
          // Dùng trực tiếp dữ liệu từ server, giữ lại id/email/token
          _user = apiUser.copyWith(
            id: apiUser.id.isNotEmpty ? apiUser.id : _user!.id,
          );
          await _saveUserData(_user!);
        }
        _status = AuthStatus.authenticated;

      } else {
        _status = AuthStatus.unauthenticated;
      }
    } catch (e) {
      _status = AuthStatus.unauthenticated;
    }

    notifyListeners();
  }

  // Đăng nhập
  Future<bool> login(String identifier, String password) async {
    _status = AuthStatus.loading;
    _errorMessage = null;
    notifyListeners();

    final result = await _authService.login(identifier, password);
    if (result['success']) {
      final serverUser = result['user'] as UserModel;
      _token = result['token'] as String?;

      // Merge with any locally saved user edits for the same user id
      final prefs = await SharedPreferences.getInstance();
      final savedUserJson = prefs.getString('user_data');
      UserModel mergedUser = serverUser;
      if (savedUserJson != null) {
        try {
          final localMap = jsonDecode(savedUserJson) as Map<String, dynamic>;
          final serverMap = serverUser.toJson();
          if (localMap['id'] == serverMap['id']) {
            // prefer non-null local values to preserve local edits
            localMap.forEach((k, v) {
              if (v != null) serverMap[k] = v;
            });
            mergedUser = UserModel.fromJson(serverMap);
          }
        } catch (e) {
          // ignore json/merge errors and fall back to server user
        }
      }

      _user = mergedUser;
      _status = AuthStatus.authenticated;

      // Save token and merged user data
      if (_token != null) await prefs.setString('auth_token', _token!);
      await _saveUserData(_user!);

      // Sign in Firebase Auth cho Firestore rules
      await _authService.signInFirebase();

      notifyListeners();
      return true;
    } else {
      _errorMessage = result['message'];
      _status = AuthStatus.unauthenticated;
      notifyListeners();
      return false;
    }
  }

  // Đăng ký
  Future<Map<String, dynamic>> register({
    required String email,
    required String username,
    required String fullName,
    required String password,
  }) async {
    _status = AuthStatus.loading;
    _errorMessage = null;
    notifyListeners();

    final result = await _authService.register(
      email: email,
      username: username,
      fullName: fullName,
      password: password,
    );

    _status = AuthStatus.unauthenticated;
    if (!result['success']) {
      _errorMessage = result['message'];
    }
    notifyListeners();

    return result;
  }

  Future<Map<String, dynamic>> updateProfile(UserModel updatedUser) async {
    final result = await _authService.updateProfile(updatedUser);
    if (result['success']) {
      _user = result['user'] as UserModel;  
      await _saveUserData(_user!);
      notifyListeners();
    }
    return result;
  }

  // Đổi mật khẩu
  Future<Map<String, dynamic>> changePassword(String oldPassword, String newPassword) async {
    _status = AuthStatus.loading;
    notifyListeners();

    final result = await _authService.changePassword(oldPassword, newPassword);

    if (result['success']) {
      // Lưu mật khẩu mới vào secure storage
      final secure = SecureStorageService();
      await secure.savePassword(newPassword);
    }

    _status = isAuthenticated ? AuthStatus.authenticated : AuthStatus.unauthenticated;
    notifyListeners();
    return result;
  }

  // Đăng xuất
  Future<void> logout() async {
    _status = AuthStatus.loading;
    notifyListeners();

    await _authService.logout();
    await _clearUserData();

    // ✅ CLEAR TOKEN KHỎI API SERVICE
    final apiService = ApiService();
    apiService.clearToken();

    _user = null;
    _token = null;
    _status = AuthStatus.unauthenticated;
    notifyListeners();
  }

  // Lưu user data vào SharedPreferences
  Future<void> _saveUserData(UserModel user) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('user_data', jsonEncode(user.toJson()));
  }

  // Xóa user data
  Future<void> _clearUserData() async {
    final prefs = await SharedPreferences.getInstance();
    // Keep locally edited `user_data` so profile changes persist across logout/login.
    // Only remove the auth token on logout.
    await prefs.remove('auth_token');
  }

  // Clear error
  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }

  // Thêm method này để cập nhật user cục bộ (fake khi backend chưa hỗ trợ)
  Future<void> updateLocalUser(UserModel updatedUser) async {
    _user = updatedUser;
    // Lưu lại vào SharedPreferences để giữ khi reload app
    await _saveUserData(updatedUser);
    notifyListeners();
  }
}
