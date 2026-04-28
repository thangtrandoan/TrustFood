import React, { useCallback, useRef, useState } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, RefreshControl, Text, Alert, Modal, TouchableOpacity, Image, ScrollView } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import {Navbar} from '../../components/Navbar';
import BottomBar from '../../components/BottomBar';
import PostItem, { Post } from '../../components/PostItem';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { getNewFeed, toggleReaction } from '../../services/firebase';
import { safeImageUri } from '../../utils/imageSource';

function formatTimeAgo(value: any): string {
  const millis = typeof value?.toMillis === 'function'
    ? value.toMillis()
    : typeof value?.seconds === 'number'
      ? value.seconds * 1000
      : 0;

  if (!millis) {
    return 'vừa xong';
  }

  const diffSec = Math.max(1, Math.floor((Date.now() - millis) / 1000));
  if (diffSec < 60) return `${diffSec}s trước`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} giờ trước`;
  return `${Math.floor(diffHour / 24)} ngày trước`;
}


function mapFeedPostToUi(post: any): Post {
  const priceMin = Number(post.price_min);
  const priceMax = Number(post.price_max);
  const hasPrice = Number.isFinite(priceMin) && Number.isFinite(priceMax);
  const priceLabel = hasPrice
    ? `${Math.max(0, Math.floor(priceMin))} - ${Math.max(0, Math.floor(priceMax))} VND`
    : 'Chưa cập nhật giá';

  return {
    id: post.post_id,
    authorId: post.author_id,
    author: post.author_username,
    createdAtLabel: formatTimeAgo(post.created_at),
    avatar: post.author_avatar,
    rating: Number(post.star_rating) || 0,
    location: post.location?.address ?? 'Chưa cập nhật địa chỉ',
    image: post.image_urls?.[0] ?? 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200',
    text: post.content ?? '',
    restaurantName: post.restaurant_name ?? 'Nhà hàng',
    priceRangeLabel: priceLabel,
    openTimeLabel: `${post.opening_time ?? '--:--'} - ${post.closing_time ?? '--:--'}`,
    likes: Number(post.like_count) || 0,
    dislikes: Number(post.dislike_count) || 0,
    comments: 0,
    liked: Boolean(post.reaction?.liked),
    disliked: Boolean(post.reaction?.disliked),
  };
}

export default function DiscoverScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [posts, setPosts] = useState<Post[]>([]);
  const [reactingPostIds, setReactingPostIds] = useState<Record<string, boolean>>({});
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const cursorRef = useRef<any>(null);
  const hasMoreRef = useRef(true);

  React.useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const feed = await getNewFeed({ pageSize: 8 });
        if (!mounted) {
          return;
        }

        setPosts(feed.items.map(mapFeedPostToUi));
        cursorRef.current = feed.nextCursor;
        hasMoreRef.current = Boolean(feed.nextCursor);
        setError('');
      } catch (e) {
        if (!mounted) {
          return;
        }
        const message = e instanceof Error ? e.message : 'Không thể tải bản tin';
        setError(message);
      } finally {
        if (mounted) {
          setInitialLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMoreRef.current || !cursorRef.current) return;
    setLoadingMore(true);

    try {
      const feed = await getNewFeed({ pageSize: 6, cursor: cursorRef.current });
      setPosts((p) => [...p, ...feed.items.map(mapFeedPostToUi)]);
      cursorRef.current = feed.nextCursor;
      hasMoreRef.current = Boolean(feed.nextCursor);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Không thể tải thêm bản tin';
      Alert.alert('Lỗi', message);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);

    try {
      const feed = await getNewFeed({ pageSize: 8 });
      setPosts(feed.items.map(mapFeedPostToUi));
      cursorRef.current = feed.nextCursor;
      hasMoreRef.current = Boolean(feed.nextCursor);
      setError('');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Không thể làm mới dữ liệu';
      setError(message);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleLike = useCallback(async (id: string) => {
    if (reactingPostIds[id]) {
      return;
    }

    const oldItem = posts.find((p) => p.id === id);
    if (!oldItem) {
      return;
    }

    setReactingPostIds((prev) => ({ ...prev, [id]: true }));

    const nextLiked = !oldItem.liked;
    const removedDislike = Boolean(oldItem.disliked && nextLiked);

    setPosts((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              liked: nextLiked,
              disliked: nextLiked ? false : p.disliked,
              likes: Math.max(0, p.likes + (nextLiked ? 1 : -1)),
              dislikes: removedDislike ? Math.max(0, p.dislikes - 1) : p.dislikes,
            }
          : p,
      ),
    );

    try {
      await toggleReaction(id, 'like');
    } catch (e) {
      setPosts((prev) => prev.map((p) => (p.id === id ? oldItem : p)));
      const message = e instanceof Error ? e.message : 'Không thể cập nhật lượt thích';
      Alert.alert('Lỗi', message);
    } finally {
      setReactingPostIds((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }, [posts, reactingPostIds]);

  const handleComment = useCallback((_id: string) => {}, []);

  const handleOpenProfile = useCallback((authorId?: string) => {
    navigation.navigate('Profile', authorId ? { userId: authorId } : undefined);
  }, [navigation]);

  const handleDislike = useCallback(async (id: string) => {
    if (reactingPostIds[id]) {
      return;
    }

    const oldItem = posts.find((p) => p.id === id);
    if (!oldItem) {
      return;
    }

    setReactingPostIds((prev) => ({ ...prev, [id]: true }));

    const nextDisliked = !oldItem.disliked;
    const removedLike = Boolean(oldItem.liked && nextDisliked);

    setPosts((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              disliked: nextDisliked,
              liked: nextDisliked ? false : p.liked,
              dislikes: Math.max(0, p.dislikes + (nextDisliked ? 1 : -1)),
              likes: removedLike ? Math.max(0, p.likes - 1) : p.likes,
            }
          : p,
      ),
    );

    try {
      await toggleReaction(id, 'dislike');
    } catch (e) {
      setPosts((prev) => prev.map((p) => (p.id === id ? oldItem : p)));
      const message = e instanceof Error ? e.message : 'Không thể cập nhật lượt không thích';
      Alert.alert('Lỗi', message);
    } finally {
      setReactingPostIds((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }, [posts, reactingPostIds]);

  return (
    <View style={styles.container}>
      <Navbar />
      {initialLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color="#F8C819" />
          <Text style={styles.stateText}>Đang tải bản tin...</Text>
        </View>
      ) : null}

      {!initialLoading && error ? (
        <View style={styles.centerState}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {!initialLoading && !error ? (
      <FlatList
        data={posts}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <PostItem
            post={item}
            onLike={handleLike}
            onDislike={handleDislike}
            onComment={handleComment}
            onPressAuthor={handleOpenProfile}
            onOpenDetail={(id) => {
              const target = posts.find((p) => p.id === id) ?? null;
              setSelectedPost(target);
            }}
          />
        )}
        onEndReachedThreshold={0.6}
        onEndReached={loadMore}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator />
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContent}
      />
      ) : null}

      <Modal visible={Boolean(selectedPost)} transparent animationType="fade" onRequestClose={() => setSelectedPost(null)}>
        <View style={styles.detailBackdrop}>
          <View style={styles.detailCard}>
            <TouchableOpacity style={styles.detailClose} onPress={() => setSelectedPost(null)}>
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedPost ? (
                <>
                  <Image source={{ uri: safeImageUri(selectedPost.image) }} style={styles.detailImage} />

                  <View style={styles.detailSection}>
                    <View style={styles.detailStars}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Ionicons
                          key={n}
                          name={n <= Math.round(selectedPost.rating || 0) ? 'star' : 'star-outline'}
                          size={16}
                          color="#FFD400"
                        />
                      ))}
                    </View>
                    <Text style={styles.detailTitle}>{selectedPost.restaurantName ?? 'Nhà hàng'}</Text>

                    <View style={styles.detailLine}>
                      <Ionicons name="location" size={14} color="#FFD400" />
                      <Text style={styles.detailText}>{selectedPost.location}</Text>
                    </View>

                    <View style={styles.detailLine}>
                      <Ionicons name="wallet" size={14} color="#FFD400" />
                      <Text style={styles.detailText}>{selectedPost.priceRangeLabel ?? 'Chưa cập nhật giá'}</Text>
                    </View>

                    <View style={styles.detailLine}>
                      <Ionicons name="time" size={14} color="#FFD400" />
                      <Text style={styles.detailText}>{selectedPost.openTimeLabel ?? '--:-- - --:--'}</Text>
                    </View>

                    <Text style={styles.detailDescription}>{selectedPost.text}</Text>
                  </View>
                </>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <BottomBar activeItem="feed" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0b0b' },
  loadingMore: { padding: 16 },
  listContent: { paddingBottom: 70 },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  stateText: { color: '#ccc', marginTop: 12 },
  errorText: { color: '#ff7b7b', textAlign: 'center', paddingHorizontal: 16 },
  detailBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  detailCard: {
    backgroundColor: '#1a1513',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#352b27',
    maxHeight: '82%',
    padding: 12,
  },
  detailClose: {
    position: 'absolute',
    right: 12,
    top: 10,
    zIndex: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailImage: {
    width: '100%',
    height: 250,
    borderRadius: 14,
    backgroundColor: '#2a2a2a',
  },
  detailSection: {
    marginTop: 12,
  },
  detailStars: {
    flexDirection: 'row',
    gap: 2,
  },
  detailTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 8,
  },
  detailLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 9,
  },
  detailText: {
    color: '#ddd',
    marginLeft: 8,
    flex: 1,
  },
  detailDescription: {
    color: '#d6d1cf',
    marginTop: 14,
    lineHeight: 20,
  },
});
