// lib/services/chat_service.dart

import 'package:dio/dio.dart';
import 'api_service.dart';

class ChatService {
  final ApiService _api = ApiService();

  // ════════════════════════════════════════════════════════════════════════
  // CONVERSATIONS
  // ════════════════════════════════════════════════════════════════════════

  /// Danh sách cuộc trò chuyện của tôi
  Future<Map<String, dynamic>> getConversations() async {
    try {
      final resp = await _api.get('/conversations');
      return {'success': true, 'data': resp.data};
    } on DioException catch (e) {
      return {'success': false, 'message': _extractMessage(e)};
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  /// Chi tiết 1 conversation
  Future<Map<String, dynamic>> getConversation(String convId) async {
    try {
      final resp = await _api.get('/conversations/$convId');
      return {'success': true, 'data': resp.data};
    } on DioException catch (e) {
      return {'success': false, 'message': _extractMessage(e)};
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  /// Tạo chat riêng 1-1 (friendId)
  Future<Map<String, dynamic>> createPrivateChat(String friendId) async {
    try {
      final resp = await _api.post('/conversations/private', data: {
        'friend_id': friendId,
      });
      return {'success': true, 'data': resp.data};
    } on DioException catch (e) {
      return {'success': false, 'message': _extractMessage(e)};
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  /// Tạo nhóm chat
  Future<Map<String, dynamic>> createGroupChat({
    required String name,
    required List<String> participantIds,
    String? avatarUrl,
  }) async {
    try {
      final resp = await _api.post('/conversations/group', data: {
        'name': name,
        'participant_ids': participantIds,
        if (avatarUrl != null) 'avatar_url': avatarUrl,
      });
      return {'success': true, 'data': resp.data};
    } on DioException catch (e) {
      return {'success': false, 'message': _extractMessage(e)};
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  /// Cập nhật nhóm (tên / avatar)
  Future<Map<String, dynamic>> updateGroup(String convId, {String? name, String? avatarUrl}) async {
    try {
      final resp = await _api.put('/conversations/$convId', data: {
        if (name != null) 'name': name,
        if (avatarUrl != null) 'avatar_url': avatarUrl,
      });
      return {'success': true, 'data': resp.data};
    } on DioException catch (e) {
      return {'success': false, 'message': _extractMessage(e)};
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  /// Đánh dấu đã đọc
  Future<Map<String, dynamic>> markAsRead(String convId) async {
    try {
      final resp = await _api.post('/conversations/$convId/read');
      return {'success': true, 'data': resp.data};
    } on DioException catch (e) {
      return {'success': false, 'message': _extractMessage(e)};
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  /// Xóa / giải tán nhóm
  Future<Map<String, dynamic>> deleteConversation(String convId) async {
    try {
      final resp = await _api.delete('/conversations/$convId');
      return {'success': true, 'data': resp.data};
    } on DioException catch (e) {
      return {'success': false, 'message': _extractMessage(e)};
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // MESSAGES
  // ════════════════════════════════════════════════════════════════════════

  /// Gửi tin nhắn text
  Future<Map<String, dynamic>> sendMessage({
    required String convId,
    String? content,
    String? messageType,
    List<String>? mediaUrls,
    String? fileUrl,
    String? fileName,
    int? fileSize,
    String? replyToId,
  }) async {
    try {
      final resp = await _api.post('/messages/send', data: {
        'conv_id': convId,
        if (content != null) 'content': content,
        if (messageType != null) 'message_type': messageType,
        if (mediaUrls != null && mediaUrls.isNotEmpty) 'media_urls': mediaUrls,
        if (fileUrl != null) 'file_url': fileUrl,
        if (fileName != null) 'file_name': fileName,
        if (fileSize != null) 'file_size': fileSize,
        if (replyToId != null) 'reply_to_id': replyToId,
      });
      return {'success': true, 'data': resp.data};
    } on DioException catch (e) {
      return {'success': false, 'message': _extractMessage(e)};
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  /// Chia sẻ bài viết qua chat
  Future<Map<String, dynamic>> sharePost({
    required String convId,
    required String postId,
    String? content,
  }) async {
    try {
      final resp = await _api.post('/messages/share', data: {
        'conv_id': convId,
        'post_id': postId,
        if (content != null) 'content': content,
      });
      return {'success': true, 'data': resp.data};
    } on DioException catch (e) {
      return {'success': false, 'message': _extractMessage(e)};
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  /// Lấy tin nhắn theo cuộc trò chuyện (phân trang)
  Future<Map<String, dynamic>> getMessages(String convId, {int page = 1, int limit = 30}) async {
    try {
      final resp = await _api.get('/messages/conversation/$convId', queryParameters: {
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

  /// Chỉnh sửa tin nhắn
  Future<Map<String, dynamic>> editMessage(String messageId, String content) async {
    try {
      final resp = await _api.put('/messages/$messageId/edit', data: {
        'content': content,
      });
      return {'success': true, 'data': resp.data};
    } on DioException catch (e) {
      return {'success': false, 'message': _extractMessage(e)};
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  /// Thu hồi tin nhắn
  Future<Map<String, dynamic>> recallMessage(String messageId) async {
    try {
      final resp = await _api.put('/messages/$messageId/recall');
      return {'success': true, 'data': resp.data};
    } on DioException catch (e) {
      return {'success': false, 'message': _extractMessage(e)};
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  /// Xóa tin nhắn (phía mình)
  Future<Map<String, dynamic>> deleteMessage(String messageId) async {
    try {
      final resp = await _api.delete('/messages/$messageId');
      return {'success': true, 'data': resp.data};
    } on DioException catch (e) {
      return {'success': false, 'message': _extractMessage(e)};
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // PARTICIPANTS
  // ════════════════════════════════════════════════════════════════════════

  /// Danh sách thành viên
  Future<Map<String, dynamic>> getMembers(String convId) async {
    try {
      final resp = await _api.get('/conversation-participants/$convId');
      return {'success': true, 'data': resp.data};
    } on DioException catch (e) {
      return {'success': false, 'message': _extractMessage(e)};
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  /// Thêm thành viên
  Future<Map<String, dynamic>> addMember(String convId, String userId) async {
    try {
      final resp = await _api.post('/conversation-participants/$convId/add/$userId');
      return {'success': true, 'data': resp.data};
    } on DioException catch (e) {
      return {'success': false, 'message': _extractMessage(e)};
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  /// Xóa thành viên
  Future<Map<String, dynamic>> removeMember(String convId, String userId) async {
    try {
      final resp = await _api.delete('/conversation-participants/$convId/remove/$userId');
      return {'success': true, 'data': resp.data};
    } on DioException catch (e) {
      return {'success': false, 'message': _extractMessage(e)};
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  /// Rời nhóm
  Future<Map<String, dynamic>> leaveGroup(String convId) async {
    try {
      final resp = await _api.post('/conversation-participants/$convId/leave');
      return {'success': true, 'data': resp.data};
    } on DioException catch (e) {
      return {'success': false, 'message': _extractMessage(e)};
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  /// Cập nhật vai trò
  Future<Map<String, dynamic>> updateRole(String convId, String userId, String role) async {
    try {
      final resp = await _api.put('/conversation-participants/$convId/$userId/role', data: {
        'role': role,
      });
      return {'success': true, 'data': resp.data};
    } on DioException catch (e) {
      return {'success': false, 'message': _extractMessage(e)};
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  /// Chuyển quyền nhóm trưởng
  Future<Map<String, dynamic>> transferLeadership(String convId, String userId) async {
    try {
      final resp = await _api.post('/conversation-participants/$convId/transfer-leadership/$userId');
      return {'success': true, 'data': resp.data};
    } on DioException catch (e) {
      return {'success': false, 'message': _extractMessage(e)};
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  /// Chặn người dùng trong chat riêng (UC4.12)
  Future<Map<String, dynamic>> blockUser(String convId) async {
    try {
      final resp = await _api.post('/conversation-participants/$convId/block');
      return {'success': true, 'data': resp.data};
    } on DioException catch (e) {
      return {'success': false, 'message': _extractMessage(e)};
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  /// Bỏ chặn người dùng trong chat riêng (UC4.13)
  Future<Map<String, dynamic>> unblockUser(String convId) async {
    try {
      final resp = await _api.post('/conversation-participants/$convId/unblock');
      return {'success': true, 'data': resp.data};
    } on DioException catch (e) {
      return {'success': false, 'message': _extractMessage(e)};
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  /// Xóa lịch sử chat phía mình (UC4.11)
  Future<Map<String, dynamic>> clearChatHistory(String convId) async {
    try {
      final resp = await _api.post('/conversation-participants/$convId/clear-history');
      return {'success': true, 'data': resp.data};
    } on DioException catch (e) {
      return {'success': false, 'message': _extractMessage(e)};
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // FRIENDS (lấy danh sách bạn bè để tạo chat / thêm member)
  // ════════════════════════════════════════════════════════════════════════

  Future<Map<String, dynamic>> getFriends() async {
    try {
      final resp = await _api.get('/friends');
      return {'success': true, 'data': resp.data};
    } on DioException catch (e) {
      return {'success': false, 'message': _extractMessage(e)};
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ════════════════════════════════════════════════════════════════════════

  String _extractMessage(DioException e) {
    try {
      if (e.response?.data != null && e.response?.data['message'] != null) {
        final msg = e.response?.data['message'];
        if (msg is List) return msg.join(', ');
        return msg.toString();
      }
    } catch (_) {}
    return e.message ?? 'Lỗi kết nối';
  }
}
