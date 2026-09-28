import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import 'package:fluttertoast/fluttertoast.dart';
import '../../providers/auth_provider.dart';
import '../../services/cloudinary_service.dart';

class EditProfileScreen extends StatefulWidget {
  const EditProfileScreen({super.key});

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  final TextEditingController _fullNameController = TextEditingController();
  final TextEditingController _bioController = TextEditingController();
  final TextEditingController _jobController = TextEditingController();
  final TextEditingController _locationController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController();

  String? _selectedGender;
  DateTime? _birthdate;

  XFile? _newAvatar;
  Uint8List? _newAvatarBytes;
  XFile? _newCover;
  Uint8List? _newCoverBytes;
  bool _isLoading = false;
  bool _isSaving = false;

  static const List<String> _genderOptions = ['male', 'female', 'other'];
  static const Map<String, String> _genderLabels = {
    'male': 'Nam',
    'female': 'Nữ',
    'other': 'Khác',
  };

  @override
  void initState() {
    super.initState();
    final user = Provider.of<AuthProvider>(context, listen: false).user;
    if (user != null) {
      _fullNameController.text = user.fullName ?? '';
      _bioController.text = user.bio ?? '';
      _jobController.text = user.job ?? '';
      _locationController.text = user.location ?? '';
      _phoneController.text = user.phone ?? '';
      _selectedGender = user.gender;
      _birthdate = user.birthdate;
    } else {
      Fluttertoast.showToast(msg: 'Không tìm thấy thông tin người dùng', backgroundColor: Colors.red);
    }
  }

  @override
  void dispose() {
    _fullNameController.dispose();
    _bioController.dispose();
    _jobController.dispose();
    _locationController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _pickAvatar() async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(source: ImageSource.gallery, imageQuality: 85);
    if (picked != null) {
      final bytes = await picked.readAsBytes();
      setState(() {
        _newAvatar = picked;
        _newAvatarBytes = bytes;
      });
    }
  }

  Future<void> _pickCover() async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(source: ImageSource.gallery, imageQuality: 85);
    if (picked != null) {
      final bytes = await picked.readAsBytes();
      setState(() {
        _newCover = picked;
        _newCoverBytes = bytes;
      });
    }
  }

  Future<void> _pickBirthdate() async {
    final now = DateTime.now();
    final initial = _birthdate ?? DateTime(now.year - 20, now.month, now.day);
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(1900),
      lastDate: now,
      helpText: 'Chọn ngày sinh',
    );
    if (picked != null) {
      setState(() => _birthdate = picked);
    }
  }

  Future<void> _saveProfile() async {
    if (_isSaving) return;

    setState(() => _isSaving = true);

    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final user = authProvider.user;

    if (user == null) {
      Fluttertoast.showToast(msg: 'Không tìm thấy thông tin người dùng', backgroundColor: Colors.red);
      setState(() => _isSaving = false);
      return;
    }

    String? newAvatarUrl;
    String? newCoverUrl;

    try {
      if (_newAvatar != null) {
        newAvatarUrl = await CloudinaryService().uploadXFile(_newAvatar!);
        if (newAvatarUrl == null) {
          Fluttertoast.showToast(msg: 'Upload avatar thất bại', backgroundColor: Colors.orange);
        }
      }
      if (_newCover != null) {
        newCoverUrl = await CloudinaryService().uploadXFile(_newCover!);
        if (newCoverUrl == null) {
          Fluttertoast.showToast(msg: 'Upload cover thất bại', backgroundColor: Colors.orange);
        }
      }

      final updatedUser = user.copyWith(
        fullName: _fullNameController.text.trim(),
        bio: _bioController.text.trim(),
        job: _jobController.text.trim(),
        location: _locationController.text.trim(),
        phone: _phoneController.text.trim(),
        gender: _selectedGender,
        birthdate: _birthdate,
        avatar: newAvatarUrl ?? user.avatar,
        cover: newCoverUrl ?? user.cover,
      );

      final result = await authProvider.updateProfile(updatedUser);
      if (result['success'] == true) {
        Fluttertoast.showToast(
          msg: 'Cập nhật hồ sơ thành công!',
          backgroundColor: Colors.green,
        );
        if (mounted) Navigator.pop(context, true);
      } else {
        Fluttertoast.showToast(
          msg: result['message'] ?? 'Không thể cập nhật',
          backgroundColor: Colors.red,
        );
        await authProvider.updateLocalUser(updatedUser);
      }
    } catch (e) {
      Fluttertoast.showToast(msg: 'Lỗi: $e', backgroundColor: Colors.red);
      print('ERROR EditProfile: $e');
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  String _formatDate(DateTime dt) {
    return '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year}';
  }

  @override
  Widget build(BuildContext context) {
    final user = Provider.of<AuthProvider>(context).user;

    if (user == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Chỉnh sửa hồ sơ')),
        body: const Center(child: Text('Không tìm thấy thông tin người dùng')),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Chỉnh sửa hồ sơ'),
        actions: [
          _isSaving
              ? const Padding(
                  padding: EdgeInsets.all(16),
                  child: SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                )
              : TextButton(
                  onPressed: _saveProfile,
                  child: const Text('Lưu', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Ảnh bìa
            Stack(
              children: [
                Container(
                  height: 150,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    image: _newCoverBytes != null
                        ? DecorationImage(image: MemoryImage(_newCoverBytes!), fit: BoxFit.cover)
                        : (user.cover != null
                            ? DecorationImage(image: NetworkImage(user.cover!), fit: BoxFit.cover)
                            : null),
                    color: Colors.blue,
                  ),
                ),
                Positioned(
                  bottom: 8,
                  right: 8,
                  child: IconButton(
                    icon: const Icon(Icons.camera_alt, color: Colors.white),
                    onPressed: _isSaving ? null : _pickCover,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Ảnh đại diện
            Center(
              child: Stack(
                children: [
                  CircleAvatar(
                    radius: 60,
                    backgroundImage: _newAvatarBytes != null
                        ? MemoryImage(_newAvatarBytes!) as ImageProvider
                        : (user.avatar != null ? NetworkImage(user.avatar!) : null),
                    child: user.avatar == null && _newAvatar == null
                        ? Text(user.fullName?[0] ?? 'U', style: const TextStyle(fontSize: 40))
                        : null,
                  ),
                  Positioned(
                    bottom: 0,
                    right: 0,
                    child: IconButton(
                      icon: const Icon(Icons.camera_alt),
                      onPressed: _isSaving ? null : _pickAvatar,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Họ tên
            TextField(
              controller: _fullNameController,
              decoration: const InputDecoration(
                labelText: 'Họ và tên',
                prefixIcon: Icon(Icons.person_outline),
                border: OutlineInputBorder(),
              ),
              enabled: !_isSaving,
            ),
            const SizedBox(height: 16),

            // Bio
            TextField(
              controller: _bioController,
              decoration: const InputDecoration(
                labelText: 'Mô tả ngắn (bio)',
                prefixIcon: Icon(Icons.info_outline),
                border: OutlineInputBorder(),
              ),
              maxLines: 3,
              enabled: !_isSaving,
            ),
            const SizedBox(height: 16),

            // Công việc
            TextField(
              controller: _jobController,
              decoration: const InputDecoration(
                labelText: 'Công việc',
                prefixIcon: Icon(Icons.work_outline),
                border: OutlineInputBorder(),
              ),
              enabled: !_isSaving,
            ),
            const SizedBox(height: 16),

            // Vị trí
            TextField(
              controller: _locationController,
              decoration: const InputDecoration(
                labelText: 'Vị trí (thành phố)',
                prefixIcon: Icon(Icons.location_on_outlined),
                border: OutlineInputBorder(),
              ),
              enabled: !_isSaving,
            ),
            const SizedBox(height: 16),

            // Số điện thoại
            TextField(
              controller: _phoneController,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(
                labelText: 'Số điện thoại',
                prefixIcon: Icon(Icons.phone_outlined),
                border: OutlineInputBorder(),
              ),
              enabled: !_isSaving,
            ),
            const SizedBox(height: 16),

            // Giới tính
            DropdownButtonFormField<String>(
              value: _selectedGender,
              decoration: const InputDecoration(
                labelText: 'Giới tính',
                prefixIcon: Icon(Icons.wc_outlined),
                border: OutlineInputBorder(),
              ),
              items: [
                const DropdownMenuItem(value: null, child: Text('-- Chọn giới tính --')),
                ..._genderOptions.map((g) => DropdownMenuItem(
                      value: g,
                      child: Text(_genderLabels[g] ?? g),
                    )),
              ],
              onChanged: _isSaving ? null : (val) => setState(() => _selectedGender = val),
            ),
            const SizedBox(height: 16),

            // Ngày sinh
            InkWell(
              onTap: _isSaving ? null : _pickBirthdate,
              borderRadius: BorderRadius.circular(4),
              child: InputDecorator(
                decoration: const InputDecoration(
                  labelText: 'Ngày sinh',
                  prefixIcon: Icon(Icons.cake_outlined),
                  border: OutlineInputBorder(),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      _birthdate != null ? _formatDate(_birthdate!) : 'Chọn ngày sinh',
                      style: TextStyle(
                        fontSize: 16,
                        color: _birthdate != null ? null : Colors.grey[500],
                      ),
                    ),
                    const Icon(Icons.calendar_today_outlined, size: 18, color: Colors.grey),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}