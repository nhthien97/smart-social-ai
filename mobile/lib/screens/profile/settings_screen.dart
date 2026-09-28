import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:fluttertoast/fluttertoast.dart';
import '../../providers/auth_provider.dart';
import '../../providers/notification_provider.dart';
import '../../providers/post_provider.dart';
import 'edit_profile_screen.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _oldPasswordController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  bool _isChangingPassword = false;
  bool _obscureOld = true;
  bool _obscureNew = true;
  bool _obscureConfirm = true;

  @override
  void dispose() {
    _oldPasswordController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _changePassword() async {
    final oldPass = _oldPasswordController.text.trim();
    final newPass = _newPasswordController.text.trim();
    final confirmPass = _confirmPasswordController.text.trim();

    if (oldPass.isEmpty || newPass.isEmpty || confirmPass.isEmpty) {
      Fluttertoast.showToast(msg: 'Vui lòng điền đầy đủ thông tin', backgroundColor: Colors.orange);
      return;
    }

    if (newPass != confirmPass) {
      Fluttertoast.showToast(msg: 'Mật khẩu xác nhận không khớp', backgroundColor: Colors.red);
      return;
    }

    if (newPass.length < 6) {
      Fluttertoast.showToast(msg: 'Mật khẩu mới phải ít nhất 6 ký tự', backgroundColor: Colors.orange);
      return;
    }

    setState(() => _isChangingPassword = true);

    try {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);

      final res = await authProvider.changePassword(oldPass, newPass);

      if (res['success']) {
        Fluttertoast.showToast(msg: 'Đổi mật khẩu thành công!', backgroundColor: Colors.green);
        _oldPasswordController.clear();
        _newPasswordController.clear();
        _confirmPasswordController.clear();
      } else {
        Fluttertoast.showToast(msg: res['message'] ?? 'Đổi mật khẩu thất bại', backgroundColor: Colors.red);
      }
    } catch (e) {
      Fluttertoast.showToast(msg: 'Lỗi đổi mật khẩu: $e', backgroundColor: Colors.red);
    } finally {
      if (mounted) setState(() => _isChangingPassword = false);
    }
  }

  Future<void> _logout() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Đăng xuất'),
        content: const Text('Bạn có chắc chắn muốn đăng xuất khỏi tài khoản này?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Hủy', style: TextStyle(color: Colors.grey)),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(context); // Đóng dialog

              try {
                // Stop Firestore notification listener
                Provider.of<NotificationProvider>(context, listen: false)
                    .stopListening();
                await authProvider.logout(); // Gọi hàm logout trong AuthProvider (clear token, reset user)

                Fluttertoast.showToast(
                  msg: 'Đã đăng xuất thành công!',
                  backgroundColor: Colors.green,
                );

                // Chuyển về màn hình login (thay '/login' bằng route thực tế của bạn)
                if (mounted) {
                  Navigator.pushNamedAndRemoveUntil(
                    context,
                    '/login', // Hoặc route login của bạn
                        (route) => false,
                  );
                }
              } catch (e) {
                Fluttertoast.showToast(
                  msg: 'Lỗi đăng xuất: $e',
                  backgroundColor: Colors.red,
                );
              }
            },
            child: const Text('Đăng xuất', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Cài đặt'),
        backgroundColor: const Color(0xFF1877F2),
        foregroundColor: Colors.white,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Phần chỉnh sửa thông tin
          ListTile(
            leading: const Icon(Icons.person_outline, color: Color(0xFF1877F2)),
            title: const Text('Chỉnh sửa thông tin cá nhân', style: TextStyle(fontWeight: FontWeight.w600)),
            subtitle: const Text('Cập nhật bio, công việc, vị trí, ảnh đại diện...'),
            trailing: const Icon(Icons.arrow_forward_ios, size: 16),
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const EditProfileScreen()),
              );
            },
          ),
          const Divider(),

          // Phần đổi mật khẩu
          const SizedBox(height: 8),
          Text(
            'Đổi mật khẩu',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.grey[800]),
          ),
          const SizedBox(height: 12),

          TextField(
            controller: _oldPasswordController,
            obscureText: _obscureOld,
            decoration: InputDecoration(
              labelText: 'Mật khẩu cũ',
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              suffixIcon: IconButton(
                icon: Icon(_obscureOld ? Icons.visibility_off : Icons.visibility),
                onPressed: () => setState(() => _obscureOld = !_obscureOld),
              ),
            ),
          ),
          const SizedBox(height: 12),

          TextField(
            controller: _newPasswordController,
            obscureText: _obscureNew,
            decoration: InputDecoration(
              labelText: 'Mật khẩu mới',
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              suffixIcon: IconButton(
                icon: Icon(_obscureNew ? Icons.visibility_off : Icons.visibility),
                onPressed: () => setState(() => _obscureNew = !_obscureNew),
              ),
            ),
          ),
          const SizedBox(height: 12),

          TextField(
            controller: _confirmPasswordController,
            obscureText: _obscureConfirm,
            decoration: InputDecoration(
              labelText: 'Xác nhận mật khẩu mới',
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              suffixIcon: IconButton(
                icon: Icon(_obscureConfirm ? Icons.visibility_off : Icons.visibility),
                onPressed: () => setState(() => _obscureConfirm = !_obscureConfirm),
              ),
            ),
          ),
          const SizedBox(height: 24),

          SizedBox(
            width: double.infinity,
            height: 50,
            child: ElevatedButton(
              onPressed: _isChangingPassword ? null : _changePassword,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF1877F2),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: _isChangingPassword
                  ? const SizedBox(
                height: 20,
                width: 20,
                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
              )
                  : const Text('Đổi mật khẩu', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ),
          ),

          const SizedBox(height: 32),
          const Divider(),

          // Phần Đăng xuất
          ListTile(
            leading: const Icon(Icons.logout, color: Colors.red),
            title: const Text('Đăng xuất', style: TextStyle(color: Colors.red, fontWeight: FontWeight.w600)),
            onTap: _logout,
          ),
        ],
      ),
    );
  }
}