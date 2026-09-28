// lib/screens/home/home_screen.dart
// test git

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/post_provider.dart';
import '../../providers/recommendation_provider.dart';
import '../../models/post_model.dart';
import 'create_post_screen.dart';
import 'post_card.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadPosts();
      _loadRecommendations();
    });
  _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _loadPosts() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final postProvider = Provider.of<PostProvider>(context, listen: false);
    final userId = authProvider.user?.id;
    await postProvider.loadPosts(refresh: true, userId: userId);
  }

  Future<void> _loadRecommendations() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final userId = authProvider.user?.id;
    if (userId == null) return;
    final recProvider = Provider.of<RecommendationProvider>(context, listen: false);
    await recProvider.loadRecommendations(userId);
  }

  Future<void> _onRefresh() async {
    await _loadPosts();
    await _loadRecommendations();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent * 0.9) {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      final postProvider = Provider.of<PostProvider>(context, listen: false);
      final userId = authProvider.user?.id;
      if (!postProvider.isLoading && postProvider.hasMore) {
        postProvider.loadPosts(userId: userId);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer3<AuthProvider, PostProvider, RecommendationProvider>(
      builder: (context, authProvider, postProvider, recProvider, child) {
        final user = authProvider.user;

        return Scaffold(
          body: RefreshIndicator(
            onRefresh: _onRefresh,
            child: CustomScrollView(
              controller: _scrollController,
              slivers: [
                // Header with user info
                SliverToBoxAdapter(
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        colors: [Color(0xFF3b82f6), Color(0xFF8b5cf6)],
                      ),
                    ),
                    child: SafeArea(
                      bottom: false,
                      child: Row(
                        children: [
                          CircleAvatar(
                            radius: 24,
                            backgroundColor: Colors.white,
                            child: user?.avatar != null
                                ? ClipOval(
                                    child: Image.network(
                                      user!.avatar!,
                                      width: 48,
                                      height: 48,
                                      fit: BoxFit.cover,
                                      errorBuilder: (context, error, stackTrace) {
                                        return Text(
                                          user.fullName?.substring(0, 1).toUpperCase() ?? 'U',
                                          style: const TextStyle(
                                            fontSize: 20,
                                            color: Color(0xFF3b82f6),
                                          ),
                                        );
                                      },
                                    ),
                                  )
                                : Text(
                                    user?.fullName?.substring(0, 1).toUpperCase() ?? 'U',
                                    style: const TextStyle(
                                      fontSize: 20,
                                      color: Color(0xFF3b82f6),
                                    ),
                                  ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Xin chào, ${user?.fullName ?? 'Người dùng'}!',
                                  style: const TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                  ),
                                ),
                                const Text(
                                  'Bạn đang nghĩ gì?',
                                  style: TextStyle(
                                    fontSize: 14,
                                    color: Colors.white70,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),

                // Create post button
                SliverToBoxAdapter(
                  child: Container(
                    margin: const EdgeInsets.all(12),
                    child: Card(
                      child: InkWell(
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => const CreatePostScreen(),
                            ),
                          ).then((_) => _loadPosts());
                        },
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Row(
                            children: [
                              CircleAvatar(
                                radius: 20,
                                backgroundColor: const Color(0xFF3b82f6),
                                child: user?.avatar != null
                                    ? ClipOval(
                                        child: Image.network(
                                          user!.avatar!,
                                          width: 40,
                                          height: 40,
                                          fit: BoxFit.cover,
                                          errorBuilder: (context, error, stackTrace) {
                                            return Text(
                                              user.fullName?.substring(0, 1).toUpperCase() ?? 'U',
                                              style: const TextStyle(color: Colors.white),
                                            );
                                          },
                                        ),
                                      )
                                    : Text(
                                        user?.fullName?.substring(0, 1).toUpperCase() ?? 'U',
                                        style: const TextStyle(color: Colors.white),
                                      ),
                              ),
                              const SizedBox(width: 12),
                              const Expanded(
                                child: Text(
                                  'Bạn đang nghĩ gì?',
                                  style: TextStyle(color: Colors.grey),
                                ),
                              ),
                              const Icon(Icons.image, color: Color(0xFF10b981)),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),

                // Posts list — recommendations interleaved every 5 posts
                if (postProvider.isLoading && postProvider.posts.isEmpty)
                  const SliverFillRemaining(
                    child: Center(child: CircularProgressIndicator()),
                  )
                else if (postProvider.posts.isEmpty)
                  const SliverFillRemaining(
                    child: Center(
                      child: Text(
                        'Chưa có bài viết nào.\nHãy tạo bài viết đầu tiên!',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: Colors.grey),
                      ),
                    ),
                  )
                else
                  SliverPadding(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    sliver: Builder(
                      builder: (ctx) {
                        // Build merged feed: inject one rec post after every 5 regular posts
                        final recList = (!recProvider.serverDown &&
                                recProvider.hasRecommendations)
                            ? recProvider.posts
                            : <Post>[];
                        final merged = <(bool, Post, String)>[];
                        int recIdx = 0;
                        for (int i = 0; i < postProvider.posts.length; i++) {
                          merged.add((false, postProvider.posts[i], ''));
                          if ((i + 1) % 5 == 0 && recIdx < recList.length) {
                            final rp = recList[recIdx++];
                            merged.add((true, rp,
                                recProvider.reasonFor(rp.id ?? '')));
                          }
                        }
                        return SliverList(
                          delegate: SliverChildBuilderDelegate(
                            (context, index) {
                              if (index < merged.length) {
                                final (isRec, post, reason) = merged[index];
                                if (isRec) {
                                  return _RecFeedItem(
                                      post: post, reason: reason);
                                }
                                return PostCard(post: post);
                              } else if (postProvider.hasMore) {
                                return const Padding(
                                  padding: EdgeInsets.all(16),
                                  child: Center(
                                      child: CircularProgressIndicator()),
                                );
                              }
                              return const SizedBox.shrink();
                            },
                            childCount: merged.length +
                                (postProvider.hasMore ? 1 : 0),
                          ),
                        );
                      },
                    ),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }


}

// ── Recommendation Feed Item ─────────────────────────────────────────────────

/// Wraps a regular [PostCard] with a small gradient banner indicating it is
/// a personalised recommendation injected into the feed.
class _RecFeedItem extends StatelessWidget {
  final Post post;
  final String reason;
  const _RecFeedItem({required this.post, required this.reason});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Gradient banner
        Container(
          margin: const EdgeInsets.only(top: 8),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFFdbeafe), Color(0xFFede9fe)],
            ),
            borderRadius: BorderRadius.only(
              topLeft: Radius.circular(12),
              topRight: Radius.circular(12),
            ),
          ),
          child: Row(
            children: [
              const Icon(Icons.auto_awesome,
                  size: 13, color: Color(0xFF3b82f6)),
              const SizedBox(width: 6),
              const Text(
                '✨ Gợi ý cho bạn',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF3b82f6),
                ),
              ),
              const Spacer(),
              Text(
                reason.isNotEmpty ? reason : 'Dành cho bạn',
                style: const TextStyle(fontSize: 11, color: Colors.grey),
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
        PostCard(post: post),
      ],
    );
  }
}
