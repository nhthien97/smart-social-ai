// lib/screens/main_screen.dart

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/notification_provider.dart';
import '../providers/friend_provider.dart';
import 'home/home_screen.dart';
import 'friends/friends_screen.dart';
import 'chat/chat_screen.dart';
import 'group/group_screen.dart';
import 'notifications/notification_screen.dart';
import 'profile/profile_screen.dart';

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  int _selectedIndex = 0;

  static const List<Widget> _screens = <Widget>[
    HomeScreen(),
    FriendsScreen(),
    ChatScreen(),
    GroupScreen(),
    NotificationScreen(),
    ProfileScreen(),
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _initNotifications();
    });
  }

  Future<void> _initNotifications() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final notifProvider = Provider.of<NotificationProvider>(context, listen: false);
    final friendProvider = Provider.of<FriendProvider>(context, listen: false);
    if (authProvider.user != null) {
      await Future.delayed(const Duration(milliseconds: 500));
      notifProvider.startListening(authProvider.user!.id);
      friendProvider.fetchPendingCount();
    }
  }

  void _onItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
    });
    // Refresh unread count when switching to notification tab
    if (index == 4) {
      Provider.of<NotificationProvider>(context, listen: false)
          .fetchUnreadCount();
    }
    // Refresh pending friend count when switching to friends tab
    if (index == 1) {
      Provider.of<FriendProvider>(context, listen: false)
          .fetchPendingCount();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _screens[_selectedIndex],
      bottomNavigationBar: Consumer2<NotificationProvider, FriendProvider>(
        builder: (context, notifProvider, friendProvider, _) {
          return BottomNavigationBar(
            type: BottomNavigationBarType.fixed,
            items: <BottomNavigationBarItem>[
              const BottomNavigationBarItem(
                icon: Icon(Icons.home),
                label: 'Trang chủ',
              ),
              BottomNavigationBarItem(
                icon: Badge(
                  isLabelVisible: friendProvider.pendingCount > 0,
                  label: Text(
                    friendProvider.pendingCount > 99
                        ? '99+'
                        : friendProvider.pendingCount.toString(),
                    style: const TextStyle(fontSize: 10, color: Colors.white),
                  ),
                  child: const Icon(Icons.people),
                ),
                label: 'Bạn bè',
              ),
              const BottomNavigationBarItem(
                icon: Icon(Icons.chat),
                label: 'Chat',
              ),
              const BottomNavigationBarItem(
                icon: Icon(Icons.group),
                label: 'Group',
              ),
              BottomNavigationBarItem(
                icon: Badge(
                  isLabelVisible: notifProvider.unreadCount > 0,
                  label: Text(
                    notifProvider.unreadCount > 99
                        ? '99+'
                        : notifProvider.unreadCount.toString(),
                    style: const TextStyle(fontSize: 10, color: Colors.white),
                  ),
                  child: const Icon(Icons.notifications),
                ),
                label: 'Thông báo',
              ),
              const BottomNavigationBarItem(
                icon: Icon(Icons.person),
                label: 'Profile',
              ),
            ],
            currentIndex: _selectedIndex,
            selectedItemColor: const Color(0xFF3b82f6),
            unselectedItemColor: Colors.grey,
            onTap: _onItemTapped,
          );
        },
      ),
    );
  }
}