// lib/utils/avatar_helper.dart

import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../services/config_service.dart';

/// Returns the avatar URL or default avatar URL from config if empty
Future<String?> getAvatarUrl(String? userAvatar) async {
  if (userAvatar != null && userAvatar.isNotEmpty) {
    return userAvatar;
  }
  
  // Try to get default avatar from config
  try {
    return await ConfigService().getDefaultAvatarUrl();
  } catch (_) {
    return null;
  }
}

/// Returns a CircleAvatar widget that displays user avatar or default avatar
Widget buildAvatarWidget({
  required String? userAvatar,
  String? userName,
  double radius = 60,
  required Future<String?> Function() getDefaultAvatar,
}) {
  return FutureBuilder<String?>(
    future: getDefaultAvatar(),
    builder: (context, snapshot) {
      final avatarUrl = userAvatar ?? snapshot.data;
      
      return CircleAvatar(
        radius: radius,
        backgroundColor: Colors.grey[300],
        child: avatarUrl != null && avatarUrl.isNotEmpty
            ? ClipOval(
                child: CachedNetworkImage(
                  imageUrl: avatarUrl,
                  width: radius * 2,
                  height: radius * 2,
                  fit: BoxFit.cover,
                  placeholder: (context, url) => const CircularProgressIndicator(),
                  errorWidget: (context, url, error) => const Icon(
                    Icons.person,
                    size: 30,
                    color: Colors.grey,
                  ),
                  cacheKey: avatarUrl,
                ),
              )
            : Text(
                userName?.isNotEmpty == true ? userName![0].toUpperCase() : 'U',
                style: TextStyle(fontSize: radius * 0.8, color: Colors.white),
              ),
      );
    },
  );
}
