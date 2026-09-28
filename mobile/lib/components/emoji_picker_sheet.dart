// lib/components/emoji_picker_sheet.dart
// Bottom sheet emoji picker đơn giản – không cần package thêm

import 'package:flutter/material.dart';

const _emojis = [
  '😀','😂','🤣','😊','😍','🥰','😘','😎','🤔','😅',
  '😭','😤','😢','😡','🤯','😴','🤗','🥳','😏','🙄',
  '👍','👎','👏','🙏','💪','🤝','✌️','🫶','❤️','🧡',
  '💛','💚','💙','💜','🖤','🤍','💔','🔥','⭐','🎉',
  '🎊','🎁','🎶','🎵','📸','💬','📢','🚀','✅','❌',
];

/// Hiển thị bottom sheet chọn emoji.
/// Khi người dùng chọn, gọi [onEmojiSelected] với emoji đó.
void showEmojiPickerSheet(
  BuildContext context, {
  required void Function(String emoji) onEmojiSelected,
}) {
  showModalBottomSheet(
    context: context,
    backgroundColor: Colors.white,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (_) => SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 40,
            height: 4,
            margin: const EdgeInsets.only(top: 10, bottom: 8),
            decoration: BoxDecoration(
              color: Colors.grey.shade300,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const Padding(
            padding: EdgeInsets.only(bottom: 8),
            child: Text(
              'Chọn emoji',
              style: TextStyle(fontSize: 13, color: Colors.grey),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 10,
                mainAxisSpacing: 4,
                crossAxisSpacing: 4,
                childAspectRatio: 1,
              ),
              itemCount: _emojis.length,
              itemBuilder: (ctx, i) => GestureDetector(
                onTap: () {
                  Navigator.pop(ctx);
                  onEmojiSelected(_emojis[i]);
                },
                child: Center(
                  child: Text(_emojis[i], style: const TextStyle(fontSize: 24)),
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),
        ],
      ),
    ),
  );
}
