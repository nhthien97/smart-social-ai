// lib/services/group_service.dart

import 'package:dio/dio.dart';
import 'api_service.dart';
import '../models/group_model.dart';

class GroupService {
  final ApiService _apiService = ApiService();

  Future<Map<String, dynamic>> createGroup(String name, String description, String? avatar, {String? coverUrl, String? ownerId}) async {
    try {
      final data = {
        'name': name,
        'description': description,
        if (avatar != null) 'avatar_url': avatar,
        if (coverUrl != null) 'cover_url': coverUrl,
        if (ownerId != null) 'owner_id': ownerId,
      };
      final response = await _apiService.post('/groups', data: data);
      return {
        'success': true,
        'message': 'Tạo nhóm thành công!',
        'group': response.data
      };
    } on DioException catch (e) {
      String message = 'Lỗi tạo nhóm';
      if (e.response?.statusCode == 401) {
        message = '🔐 Phiên hết hạn. Vui lòng đăng nhập lại.';
      } else if (e.response?.statusCode == 403) {
        message = '⚠️ Bạn không có quyền tạo nhóm.';
      } else if (e.response?.statusCode == 400) {
        message = '❌ Dữ liệu không hợp lệ. Kiểm tra tên và mô tả.';
      } else if (e.response?.statusCode == 500) {
        message = '⚠️ Lỗi máy chủ. Vui lòng thử lại sau.';
      } else if (e.response?.data != null && e.response?.data['message'] != null) {
        message = e.response?.data['message'];
      }
      
      return {
        'success': false,
        'message': message,
        'statusCode': e.response?.statusCode,
        'error': e.message,
      };
    } catch (e) {
      return {
        'success': false,
        'message': 'Lỗi không xác định: ${e.toString()}',
      };
    }
  }

  Future<Map<String, dynamic>> getGroups() async {
    try {
      final response = await _apiService.get('/groups');

      List<dynamic> myGroupsJson = [];
      List<dynamic> suggestedGroupsJson = [];

      if (response.data is List) {
        myGroupsJson = response.data as List<dynamic>;
      } else if (response.data is Map) {
        myGroupsJson = response.data['myGroups'] as List<dynamic>? ?? [];
        suggestedGroupsJson = response.data['suggestedGroups'] as List<dynamic>? ?? [];
      }

      final myGroups = myGroupsJson
          .map((g) => GroupModel.fromJson(g as Map<String, dynamic>))
          .toList();

      final suggestedGroups = suggestedGroupsJson
          .map((g) => GroupModel.fromJson(g as Map<String, dynamic>))
          .toList();

      return {
        'success': true,
        'myGroups': myGroups,
        'suggestedGroups': suggestedGroups,
      };
    } on DioException catch (e) {
      
      String message = 'Lỗi khi tải danh sách nhóm (${e.response?.statusCode})';
      if (e.response?.statusCode == 403) {
        message = '⚠️ Không có quyền truy cập. Vui lòng đăng nhập lại.';
      } else if (e.response?.statusCode == 401) {
        message = '🔐 Phiên hết hạn. Vui lòng đăng nhập lại.';
      } else if (e.response?.data != null && e.response?.data['message'] != null) {
        message = e.response?.data['message'];
      }
      
      return {
        'success': false,
        'message': message,
        'statusCode': e.response?.statusCode,
      };
    } catch (e) {
      return {
        'success': false,
        'message': 'Lỗi không xác định: ${e.toString()}',
      };
    }
  }

  // Get posts of a group (approved or all depending on backend and auth)
  Future<List<dynamic>> getGroupPosts(String groupId, {String? status, String? userId}) async {
    try {
      final query = <String, dynamic>{'group_id': groupId};
      if (status != null) query['status'] = status;
      if (userId != null) query['user_id'] = userId;
      final resp = await _apiService.get('/posts', queryParameters: query);
      final list = resp.data['posts'] as List<dynamic>? ?? [];
      return list;
    } on DioException catch (e) {
      return [];
    } catch (e) {
      return [];
    }
  }

  // Create a post inside a group
  Future<Map<String, dynamic>?> createGroupPost(String groupId, {required String content, List<String>? mediaUrls, String? contentType, List<String>? tags}) async {
    try {
      final data = {
        'content': content,
        if (mediaUrls != null && mediaUrls.isNotEmpty) 'media_urls': mediaUrls,
        if (contentType != null) 'content_type': contentType,
        if (tags != null && tags.isNotEmpty) 'tags': tags,
      };
      final resp = await _apiService.post('/groups/$groupId/posts', data: data);
      return resp.data as Map<String, dynamic>;
    } on DioException catch (e) {
      return null;
    } catch (e) {
      return null;
    }
  }

  Future<Map<String, dynamic>> joinGroup(String groupId) async {
    try {
      final resp = await _apiService.post('/groups/$groupId/join');
      final memberStatus = (resp.data is Map ? (resp.data['status']?.toString() ?? '') : '');
      final isPending = memberStatus.toUpperCase() == 'PENDING';
      return {
        'success': true,
        'message': isPending ? 'Yêu cầu tham gia đã được gửi, chờ duyệt!' : 'Tham gia nhóm thành công!',
        'isPending': isPending,
      };
    } on DioException catch (e) {
      String message = 'Lỗi tham gia nhóm';
      if (e.response?.statusCode == 403) {
        message = '⚠️ Không thể tham gia nhóm này.';
      } else if (e.response?.statusCode == 401) {
        message = '🔐 Phiên hết hạn. Vui lòng đăng nhập lại.';
      } else if (e.response?.data != null && e.response?.data['message'] != null) {
        message = e.response?.data['message'];
      }
      return {'success': false, 'message': message, 'statusCode': e.response?.statusCode};
    } catch (e) {
      return {'success': false, 'message': 'Lỗi tham gia: $e'};
    }
  }

  Future<Map<String, dynamic>> leaveGroup(String groupId) async {
    try {
      await _apiService.post('/groups/$groupId/leave');
      return {'success': true, 'message': 'Rời nhóm thành công!'};
    } on DioException catch (e) {
      String message = 'Lỗi rời nhóm';
      if (e.response?.statusCode == 403) {
        message = '⚠️ Trưởng nhóm không thể rời nhóm. Hãy chuyển quyền trước.';
      } else if (e.response?.statusCode == 401) {
        message = '🔐 Phiên hết hạn. Vui lòng đăng nhập lại.';
      } else if (e.response?.data != null && e.response?.data['message'] != null) {
        message = e.response?.data['message'];
      }
      return {'success': false, 'message': message, 'statusCode': e.response?.statusCode};
    } catch (e) {
      return {'success': false, 'message': 'Lỗi rời nhóm: $e'};
    }
  }

  Future<Map<String, dynamic>> addMember(String groupId, String userId) async {
    try {
      await _apiService.post('/groups/$groupId/members', data: {'userId': userId});
      return {'success': true, 'message': 'Thêm thành viên thành công!'};
    } on DioException catch (e) {
      String message = 'Lỗi thêm thành viên';
      if (e.response?.statusCode == 403) {
        message = '⚠️ Bạn không có quyền thêm thành viên.';
      } else if (e.response?.statusCode == 401) {
        message = '🔐 Phiên hết hạn. Vui lòng đăng nhập lại.';
      } else if (e.response?.statusCode == 400) {
        message = '❌ Người dùng này không tồn tại hoặc đã là thành viên.';
      } else if (e.response?.data != null && e.response?.data['message'] != null) {
        message = e.response?.data['message'];
      }
      return {'success': false, 'message': message, 'statusCode': e.response?.statusCode};
    } catch (e) {
      return {'success': false, 'message': 'Lỗi thêm thành viên: $e'};
    }
  }

  Future<Map<String, dynamic>> removeMember(String groupId, String userId) async {
    try {
      await _apiService.delete('/groups/$groupId/members/$userId');
      return {
        'success': true,
        'message': 'Xóa thành viên thành công!',
      };
    } on DioException catch (e) {
      String message = 'Lỗi xóa thành viên';
      final status = e.response?.statusCode;
      final serverMessage = e.response?.data?['message'] as String?;

      if (status == 403) {
        message = serverMessage ?? '⚠️ Bạn không có quyền xóa thành viên này.';
      } else if (status == 401) {
        message = '🔐 Phiên hết hạn. Vui lòng đăng nhập lại.';
      } else if (status == 400) {
        // Lấy message từ server thay vì hardcode
        message = serverMessage ?? '❌ Yêu cầu không hợp lệ (thành viên không tồn tại hoặc lỗi khác).';
      } else if (serverMessage != null) {
        message = serverMessage;
      }

      print('Remove member error - status: $status, message: $message');
      return {
        'success': false,
        'message': message,
        'statusCode': status,
      };
    } catch (e) {
      print('Unexpected remove member error: $e');
      return {
        'success': false,
        'message': 'Lỗi xóa thành viên: $e',
      };
    }
  }

  Future<Map<String, dynamic>> transferOwnership(String groupId, String newOwnerId) async {
    try {
      await _apiService.post('/groups/$groupId/transfer-admin', data: {'new_admin_id': newOwnerId});
      return {'success': true, 'message': 'Chuyển quyền thành công!'};
    } on DioException catch (e) {
      String message = 'Lỗi chuyển quyền';
      if (e.response?.statusCode == 403) {
        message = '⚠️ Bạn không có quyền chuyển quyền.';
      } else if (e.response?.statusCode == 401) {
        message = '🔐 Phiên hết hạn. Vui lòng đăng nhập lại.';
      } else if (e.response?.statusCode == 400) {
        message = '❌ Người dùng này không phải là thành viên của nhóm.';
      } else if (e.response?.data != null && e.response?.data['message'] != null) {
        message = e.response?.data['message'];
      }
      return {'success': false, 'message': message, 'statusCode': e.response?.statusCode};
    } catch (e) {
      return {'success': false, 'message': 'Lỗi chuyển quyền: $e'};
    }
  }

  // Get pending join requests (admin/mod only)
  Future<List<dynamic>> getPendingMembers(String groupId) async {
    try {
      final resp = await _apiService.get('/groups/$groupId/pending-members');
      return resp.data as List<dynamic>;
    } on DioException catch (e) {
      print('❌ GroupService: getPendingMembers error: ${e.message} (${e.response?.statusCode})');
      return [];
    } catch (e) {
      print('❌ GroupService: getPendingMembers unexpected: $e');
      return [];
    }
  }

  // Approve a pending member (admin/mod only)
  Future<Map<String, dynamic>> approvePendingMember(String groupId, String memberId) async {
    try {
      await _apiService.post('/groups/$groupId/members/$memberId/approve');
      return {'success': true, 'message': 'Đã duyệt thành viên!'};
    } on DioException catch (e) {
      String message = 'Lỗi duyệt thành viên';
      if (e.response?.data?['message'] != null) message = e.response!.data['message'];
      return {'success': false, 'message': message};
    } catch (e) {
      return {'success': false, 'message': 'Lỗi: $e'};
    }
  }

  // Reject a pending member (admin/mod only)
  Future<Map<String, dynamic>> rejectPendingMember(String groupId, String memberId) async {
    try {
      await _apiService.post('/groups/$groupId/members/$memberId/reject');
      return {'success': true, 'message': 'Đã từ chối yêu cầu!'};
    } on DioException catch (e) {
      String message = 'Lỗi từ chối thành viên';
      if (e.response?.data?['message'] != null) message = e.response!.data['message'];
      return {'success': false, 'message': message};
    } catch (e) {
      return {'success': false, 'message': 'Lỗi: $e'};
    }
  }

  // Update group approval settings
  Future<Map<String, dynamic>> updateGroupSettings(
    String groupId, {
    bool? requirePostApproval,
    bool? requireMemberApproval,
  }) async {
    try {
      final data = <String, dynamic>{};
      if (requirePostApproval != null) data['require_post_approval'] = requirePostApproval;
      if (requireMemberApproval != null) data['require_member_approval'] = requireMemberApproval;
      await _apiService.put('/groups/$groupId', data: data);
      return {'success': true, 'message': 'Cập nhật cài đặt thành công!'};
    } on DioException catch (e) {
      String message = 'Lỗi cập nhật cài đặt';
      if (e.response?.data?['message'] != null) message = e.response!.data['message'];
      return {'success': false, 'message': message};
    } catch (e) {
      return {'success': false, 'message': 'Lỗi: $e'};
    }
  }

  Future<Map<String, dynamic>> getGroupDetail(String groupId) async {
    try {
      final response = await _apiService.get('/groups/$groupId');
      final data = response.data;
      final groupJson = (data is Map && data['group'] != null)
          ? Map<String, dynamic>.from(data['group'] as Map)
          : (data is Map ? Map<String, dynamic>.from(data as Map) : <String, dynamic>{});

      final membersRaw = (data is Map && data['members'] is List)
          ? data['members'] as List<dynamic>
          : <dynamic>[];

      final userRole = data is Map ? (data['userRole']?.toString()) : null;

      final group = GroupModel.fromJson(groupJson);
      final members = membersRaw
          .map((m) => Map<String, dynamic>.from(m as Map))
          .toList();

      return {
        'success': true,
        'group': group,
        'members': members,
        'userRole': userRole,
        'isPendingJoin': data is Map ? (data['isPendingJoin'] == true) : false,
      };
    } on DioException catch (e) {
      String message = 'Lỗi tải chi tiết nhóm';
      if (e.response?.statusCode == 403) {
        message = '⚠️ Không có quyền xem nhóm này.';
      } else if (e.response?.statusCode == 401) {
        message = '🔐 Phiên hết hạn. Vui lòng đăng nhập lại.';
      } else if (e.response?.statusCode == 404) {
        message = '❌ Nhóm không tồn tại.';
      } else if (e.response?.data != null && e.response?.data['message'] != null) {
        message = e.response?.data['message'];
      }
      return {'success': false, 'message': message, 'statusCode': e.response?.statusCode};
    } catch (e) {
      return {'success': false, 'message': 'Lỗi tải chi tiết nhóm: $e'};
    }
  }

  Future<Map<String, dynamic>> updateMemberRole(String groupId, String userId, String role) async {
    try {
      await _apiService.put(
        '/groups/$groupId/members/$userId/role',
        data: {'role': role},
      );
      return {'success': true, 'message': 'Cập nhật vai trò thành công!'};
    } on DioException catch (e) {
      String message = 'Lỗi cập nhật vai trò';
      if (e.response?.statusCode == 403) {
        message = '⚠️ Bạn không có quyền cập nhật vai trò.';
      } else if (e.response?.statusCode == 401) {
        message = '🔐 Phiên hết hạn. Vui lòng đăng nhập lại.';
      } else if (e.response?.statusCode == 400) {
        message = '❌ Vai trò không hợp lệ.';
      } else if (e.response?.data != null && e.response?.data['message'] != null) {
        message = e.response?.data['message'];
      }
      return {'success': false, 'message': message, 'statusCode': e.response?.statusCode};
    } catch (e) {
      return {'success': false, 'message': 'Lỗi cập nhật vai trò: $e'};
    }
  }

  Future<Map<String, dynamic>> deleteGroup(String groupId) async {
    try {
      await _apiService.delete('/groups/$groupId');
      return {'success': true, 'message': 'Xóa nhóm thành công!'};
    } on DioException catch (e) {
      String message = 'Lỗi xóa nhóm';
      if (e.response?.statusCode == 403) {
        message = '⚠️ Chỉ trưởng nhóm mới có thể xóa nhóm.';
      } else if (e.response?.statusCode == 401) {
        message = '🔐 Phiên hết hạn. Vui lòng đăng nhập lại.';
      } else if (e.response?.data != null && e.response?.data['message'] != null) {
        message = e.response?.data['message'];
      }
      return {'success': false, 'message': message, 'statusCode': e.response?.statusCode};
    } catch (e) {
      return {'success': false, 'message': 'Lỗi xóa nhóm: $e'};
    }
  }

  Future<Map<String, dynamic>> updateGroup(
      String groupId, String name, String description, String? avatar, {String? coverUrl}) async {
    try {
      final data = {
        'name': name,
        'description': description,
        if (avatar != null) 'avatar_url': avatar,
        if (coverUrl != null) 'cover_url': coverUrl,
      };
      final response = await _apiService.put('/groups/$groupId', data: data);
      return {
        'success': true,
        'message': 'Cập nhật nhóm thành công!',
        'group': response.data
      };
    } on DioException catch (e) {
      String message = 'Lỗi cập nhật nhóm';
      if (e.response?.statusCode == 403) {
        message = '⚠️ Bạn không có quyền cập nhật nhóm này.';
      } else if (e.response?.statusCode == 401) {
        message = '🔐 Phiên hết hạn. Vui lòng đăng nhập lại.';
      } else if (e.response?.statusCode == 400) {
        message = '❌ Dữ liệu không hợp lệ.';
      } else if (e.response?.data != null && e.response?.data['message'] != null) {
        message = e.response?.data['message'];
      }
      return {'success': false, 'message': message, 'statusCode': e.response?.statusCode};
    } catch (e) {
      return {'success': false, 'message': 'Lỗi cập nhật nhóm: $e'};
    }
  }


  Future<List<dynamic>> getPendingPosts(String groupId) async {
    try {
      final resp = await _apiService.get('/groups/$groupId/posts/pending/list');
      return resp.data as List<dynamic>;
    } on DioException catch (e) {
      print('❌ GroupService: getPendingPosts error: ${e.message}');
      return [];
    } catch (e) {
      print('❌ GroupService: getPendingPosts unexpected: $e');
      return [];
    }
  }

  Future<Map<String, dynamic>> approvePost(String groupId, String postId) async {
    try {
      await _apiService.post('/groups/$groupId/posts/$postId/approve');
      return {'success': true, 'message': 'Đã duyệt bài viết!'};
    } on DioException catch (e) {
      String message = 'Lỗi duyệt bài viết';
      if (e.response?.data?['message'] != null) message = e.response!.data['message'];
      return {'success': false, 'message': message};
    } catch (e) {
      return {'success': false, 'message': 'Lỗi: $e'};
    }
  }

  // Reject a pending post (admin/mod only)
  Future<Map<String, dynamic>> rejectPost(String groupId, String postId, {String? reason}) async {
    try {
      await _apiService.post('/groups/$groupId/posts/$postId/reject', data: {
        if (reason != null) 'rejected_reason': reason,
      });
      return {'success': true, 'message': 'Đã từ chối bài viết!'};
    } on DioException catch (e) {
      String message = 'Lỗi từ chối bài viết';
      if (e.response?.data?['message'] != null) message = e.response!.data['message'];
      return {'success': false, 'message': message};
    } catch (e) {
      return {'success': false, 'message': 'Lỗi: $e'};
    }
  }
}