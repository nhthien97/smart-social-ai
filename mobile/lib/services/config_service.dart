// lib/services/config_service.dart

import 'package:dio/dio.dart';
import '../config/app_config.dart';

class ConfigService {
  static final ConfigService _instance = ConfigService._internal();
  factory ConfigService() => _instance;

  Map<String, dynamic>? _cache;
  final Dio _dio = Dio();

  ConfigService._internal();

  Future<Map<String, dynamic>> fetchConfig({bool force = false}) async {
    if (_cache != null && !force) return _cache!;

    // Try fetching from BE API first (public settings endpoint)
    try {
      final apiUrl = '${AppConfig.apiBaseUrl}/settings/public';
      final resp = await _dio.get(apiUrl);
      if (resp.statusCode == 200 && resp.data != null) {
        final List<dynamic> settings = resp.data is List ? resp.data : [];
        final Map<String, dynamic> result = {};
        for (final s in settings) {
          if (s is Map<String, dynamic>) {
            final key = s['setting_key']?.toString() ?? '';
            final value = s['setting_value'];
            final dataType = s['data_type']?.toString() ?? 'string';
            if (key.isNotEmpty) {
              if (dataType == 'number') {
                result[key] = int.tryParse(value?.toString() ?? '') ?? value;
              } else if (dataType == 'boolean') {
                result[key] = value?.toString().toLowerCase() == 'true';
              } else {
                result[key] = value;
              }
            }
          }
        }
        if (result.isNotEmpty) {
          _cache = result;
          return _cache!;
        }
      }
    } catch (e) {
      print('ConfigService: BE API fetch failed, falling back to static config: $e');
    }

    // Fallback: fetch from static NextJS config
    final url = AppConfig.flutterConfigUrl;
    if (url.isEmpty) return {};

    try {
      final resp = await _dio.get(url);
      if (resp.statusCode == 200 && resp.data != null) {
        // Handle List format from API: [{setting_key, setting_value, data_type}]
        if (resp.data is List) {
          final Map<String, dynamic> result = {};
          for (final s in resp.data as List) {
            if (s is Map<String, dynamic>) {
              final key = s['setting_key']?.toString() ?? '';
              final value = s['setting_value'];
              final dataType = s['data_type']?.toString() ?? 'string';
              if (key.isNotEmpty) {
                if (dataType == 'number') {
                  result[key] = int.tryParse(value?.toString() ?? '') ?? value;
                } else if (dataType == 'boolean') {
                  result[key] = value?.toString().toLowerCase() == 'true';
                } else {
                  result[key] = value;
                }
              }
            }
          }
          _cache = result;
        } else if (resp.data is Map<String, dynamic>) {
          _cache = Map<String, dynamic>.from(resp.data);
        } else {
          _cache = {};
        }
        return _cache!;
      }
    } catch (e) {
      // ignore, return empty
      print('ConfigService.fetchConfig error: $e');
    }

    return {};
  }

  Future<int> getMaxGroupMembers() async {
    final cfg = await fetchConfig();
    try {
      final raw = cfg['max_group_members'];
      if (raw == null) return 999999;
      if (raw is int) return raw;
      return int.tryParse(raw.toString()) ?? 999999;
    } catch (_) {
      return 999999;
    }
  }

  Future<int> getMaxGroupsPerUser({bool force = false}) async {
    final cfg = await fetchConfig(force: force);
    try {
      final raw = cfg['max_groups_per_user'];
      if (raw == null) return 999999;
      if (raw is int) return raw;
      return int.tryParse(raw.toString()) ?? 999999;
    } catch (_) {
      return 999999;
    }
  }

  Future<int> getMaxPostLength() async {
    final cfg = await fetchConfig();
    try {
      final raw = cfg['max_post_length'];
      if (raw == null) return 2000;
      if (raw is int) return raw;
      return int.tryParse(raw.toString()) ?? 2000;
    } catch (_) {
      return 2000;
    }
  }

  Future<int> getMaxUploadSizeMb() async {
    final cfg = await fetchConfig();
    try {
      final raw = cfg['max_upload_size_mb'];
      if (raw == null) return 9;
      if (raw is int) return raw;
      return int.tryParse(raw.toString()) ?? 9;
    } catch (_) {
      return 9;
    }
  }

  Future<bool> getAllowRegistration() async {
    final cfg = await fetchConfig();
    try {
      final raw = cfg['allow_registration'];
      if (raw == null) return true;
      if (raw is bool) return raw;
      return raw.toString().toLowerCase() == 'true';
    } catch (_) {
      return true;
    }
  }

  Future<bool> getMaintenanceMode() async {
    final cfg = await fetchConfig();
    try {
      final raw = cfg['maintenance_mode'];
      if (raw == null) return false;
      if (raw is bool) return raw;
      return raw.toString().toLowerCase() == 'true';
    } catch (_) {
      return false;
    }
  }

  Future<String?> getDefaultAvatarUrl() async {
    final cfg = await fetchConfig();
    try {
      final raw = cfg['default_avatar_url'];
      if (raw == null) return null;
      return raw.toString();
    } catch (_) {
      return null;
    }
  }

  Future<String> getAllowedImageTypes() async {
    final cfg = await fetchConfig();
    try {
      final raw = cfg['allowed_image_types'];
      if (raw == null) return 'jpg,jpeg,png,webp,gif';
      return raw.toString();
    } catch (_) {
      return 'jpg,jpeg,png,webp,gif';
    }
  }

  Future<int> getMaxImagesPerPost() async {
    final cfg = await fetchConfig();
    try {
      final raw = cfg['max_images_per_post'];
      if (raw == null) return 10;
      if (raw is int) return raw;
      return int.tryParse(raw.toString()) ?? 10;
    } catch (_) {
      return 10;
    }
  }

  Future<bool> getRecommendationEnabled() async {
    final cfg = await fetchConfig();
    try {
      final raw = cfg['recommendation_enabled'];
      if (raw == null) return true;
      if (raw is bool) return raw;
      return raw.toString().toLowerCase() == 'true';
    } catch (_) {
      return true;
    }
  }

  Future<int> getAutoHidePostReportThreshold({bool force = false}) async {
    final cfg = await fetchConfig(force: force);
    try {
      final raw = cfg['auto_hide_post_report_threshold'];
      if (raw == null) return 5;
      if (raw is int) return raw;
      return int.tryParse(raw.toString()) ?? 5;
    } catch (_) {
      return 5;
    }
  }

  Future<String> getMaintenanceMessage() async {
    final cfg = await fetchConfig();
    try {
      final raw = cfg['maintenance_message'];
      if (raw == null) return 'Hệ thống đang bảo trì, vui lòng quay lại sau.';
      return raw.toString();
    } catch (_) {
      return 'Hệ thống đang bảo trì, vui lòng quay lại sau.';
    }
  }

  void clearCache() => _cache = null;
}
