import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { useAuth } from '../../context/AuthContext';
import { DEFAULT_AVATAR_URL } from '../../services/firebase/constants';
import { getCurrentUserProfile, getUserProfileById, getUserProfileFeed } from '../../services/firebase';
import TopBar from '../../components/TopBar';
import { safeImageUri } from '../../utils/imageSource';

type ReviewImage = {
  id: string;
  imageUrl: string;
  restaurantName: string;
  location: string;
  rating: number;
  content: string;
  priceRangeLabel: string;
  openTimeLabel: string;
};

function mapPostToReview(post: any): ReviewImage {
  const priceMin = Number(post.price_min);
  const priceMax = Number(post.price_max);
  const hasPrice = Number.isFinite(priceMin) && Number.isFinite(priceMax);

  return {
    id: String(post.post_id ?? ''),
    imageUrl: post.image_urls?.[0] ?? 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200',
    restaurantName: post.restaurant_name ?? 'Nhà hàng',
    location: post.location?.address ?? 'Chưa cập nhật địa chỉ',
    rating: Number(post.star_rating) || 0,
    content: post.content ?? '',
    priceRangeLabel: hasPrice
      ? `${Math.max(0, Math.floor(priceMin))} - ${Math.max(0, Math.floor(priceMax))} VND`
      : 'Chưa cập nhật giá',
    openTimeLabel: `${post.opening_time ?? '--:--'} - ${post.closing_time ?? '--:--'}`,
  };
}

export default function ProfileReviewsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const { user } = useAuth();
  const routeUserId = (route.params as { userId?: string } | undefined)?.userId;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState({
    name: 'Người dùng',
    username: 'user',
    avatar: 'https://i.pravatar.cc/300?img=12',
    bio: '',
    followers: 0,
    following: 0,
    reviews: 0,
  });
  const [reviewImages, setReviewImages] = useState<ReviewImage[]>([]);
  const [selectedReview, setSelectedReview] = useState<ReviewImage | null>(null);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      (async () => {
        setLoading(true);
        setError('');

        try {
          const uid = routeUserId ?? user?.user_id;
          if (!uid) {
            throw new Error('UNAUTHENTICATED');
          }

          const [currentProfile, feed] = await Promise.all([
            routeUserId ? getUserProfileById(routeUserId) : getCurrentUserProfile(),
            getUserProfileFeed(uid, { pageSize: 30 }),
          ]);

          if (!mounted) {
            return;
          }

          if (currentProfile) {
            setProfile({
              name: currentProfile.full_name,
              username: currentProfile.user_name,
              avatar: currentProfile.avatar_url,
              bio: currentProfile.bio ?? '',
              followers: currentProfile.follower_count,
              following: currentProfile.following_count,
              reviews: currentProfile.review_count,
            });
          }

          setReviewImages(
            feed.items
              .filter((post) => Array.isArray(post.image_urls) && post.image_urls.length > 0)
              .map(mapPostToReview),
          );
        } catch (e) {
          if (!mounted) {
            return;
          }
          setError(e instanceof Error ? e.message : 'Không thể tải bài review');
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      })();

      return () => {
        mounted = false;
      };
    }, [routeUserId, user?.user_id]),
  );

  const headerStats = useMemo(
    () => `${profile.followers} người theo dõi · ${profile.following} đang theo dõi · ${profile.reviews} bài đánh giá`,
    [profile.followers, profile.following, profile.reviews],
  );
  const handleBack = useCallback(() => {
      if (navigation.canGoBack()) {
        navigation.goBack();
        return;
      }
      navigation.navigate('Profile');
    }, [navigation]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0e0907" />
      <FlatList
        data={reviewImages}
        keyExtractor={(item) => item.id}
        numColumns={3}
        initialNumToRender={12}
        windowSize={11}
        maxToRenderPerBatch={12}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <TopBar title="Cá nhân" leftIcon="arrow-back" onPressLeft={handleBack} showRight={false} />
            </View>

            <View style={styles.profileBox}>
              <Image source={{ uri: safeImageUri(profile.avatar, DEFAULT_AVATAR_URL) }} style={styles.avatar} />
              <Text style={styles.name}>{profile.name}</Text>
              <Text style={styles.username}>{profile.username}</Text>
              <Text style={styles.bioText} numberOfLines={2}>
                {profile.bio?.trim() ? profile.bio : 'Chưa có bio.'}
              </Text>
              <Text style={styles.stats}>{headerStats}</Text>
            </View>

            <View style={styles.separator} />
            {loading ? (
              <View style={styles.centerState}>
                <ActivityIndicator color="#FFD14A" />
                <Text style={styles.stateText}>Đang tải review...</Text>
              </View>
            ) : null}
            {!loading && error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={() => setSelectedReview(item)}>
            <Image source={{ uri: safeImageUri(item.imageUrl) }} style={styles.foodImage} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !loading && !error ? <Text style={styles.emptyText}>Bạn chưa có bài review nào.</Text> : null
        }
      />

      <Modal visible={Boolean(selectedReview)} transparent animationType="fade" onRequestClose={() => setSelectedReview(null)}>
        <View style={styles.detailBackdrop}>
          <View style={styles.detailCard}>
            <TouchableOpacity style={styles.detailClose} onPress={() => setSelectedReview(null)}>
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedReview ? (
                <>
                  <Image source={{ uri: safeImageUri(selectedReview.imageUrl) }} style={styles.detailImage} />

                  <View style={styles.detailSection}>
                    <View style={styles.detailStars}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Ionicons
                          key={n}
                          name={n <= Math.round(selectedReview.rating || 0) ? 'star' : 'star-outline'}
                          size={16}
                          color="#FFD400"
                        />
                      ))}
                    </View>

                    <Text style={styles.detailTitle}>{selectedReview.restaurantName}</Text>

                    <View style={styles.detailLine}>
                      <Ionicons name="location" size={14} color="#FFD400" />
                      <Text style={styles.detailText}>{selectedReview.location}</Text>
                    </View>

                    <View style={styles.detailLine}>
                      <Ionicons name="wallet" size={14} color="#FFD400" />
                      <Text style={styles.detailText}>{selectedReview.priceRangeLabel}</Text>
                    </View>

                    <View style={styles.detailLine}>
                      <Ionicons name="time" size={14} color="#FFD400" />
                      <Text style={styles.detailText}>{selectedReview.openTimeLabel}</Text>
                    </View>

                    <Text style={styles.detailDescription}>{selectedReview.content}</Text>
                  </View>
                </>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0e0907',
  },
  content: {
    paddingHorizontal: 10,
    paddingBottom: 24,
  },
  header: {
    marginBottom: 2,
  },
  profileBox: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 12,
  },
  avatar: {
    width: 78,
    height: 78,
    borderRadius: 39,
    marginBottom: 12,
  },
  name: {
    color: '#f8f1ed',
    fontSize: 31,
    fontWeight: '700',
  },
  username: {
    color: '#9f938d',
    fontSize: 19,
    marginTop: 2,
  },
  bioText: {
    color: '#9f938d',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  stats: {
    color: '#d7cbc5',
    fontSize: 15,
    marginTop: 8,
    textAlign: 'center',
  },
  separator: {
    height: 1,
    backgroundColor: '#231916',
    marginBottom: 14,
  },
  centerState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  stateText: {
    color: '#aaa',
    marginTop: 8,
  },
  errorText: {
    color: '#ff7b7b',
    textAlign: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  emptyText: {
    color: '#8f8f8f',
    textAlign: 'center',
    paddingVertical: 20,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  card: {
    width: '32.2%',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1e1512',
  },
  foodImage: {
    width: '100%',
    aspectRatio: 1,
  },

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
