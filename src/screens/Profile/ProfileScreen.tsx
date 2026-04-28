import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootNavigator';
import BottomBar from '../../components/BottomBar';
import TopBar from '../../components/TopBar';
import { useAuth } from '../../context/AuthContext';
import { DEFAULT_AVATAR_URL } from '../../services/firebase/constants';
import {
  followUser,
  getCurrentUserProfile,
  getMyFollowings,
  getUserProfileById,
  getUserProfileFeed,
  unfollowUser,
} from '../../services/firebase';
import { safeImageUri } from '../../utils/imageSource';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
type MenuAction = 'terms' | 'helpCenter' | 'shareApp' | 'changePassword';

type MenuItem = {
  id: string;
  icon: IconName;
  title: string;
  desc: string;
  action: MenuAction;
};

type ReviewPost = {
  id: string;
  imageUrl: string;
  restaurantName: string;
  location: string;
  rating: number;
  content: string;
  priceRangeLabel: string;
  openTimeLabel: string;
};

const settingItems: MenuItem[] = [
  {
    id: 'terms',
    icon: 'help-circle-outline',
    title: 'Điều khoản sử dụng',
    desc: 'Tìm hiểu cách ứng dụng hoạt động',
    action: 'terms',
  },
  {
    id: 'help-center',
    icon: 'headset-outline',
    title: 'Trung tâm trợ giúp',
    desc: 'Hỗ trợ bạn trong quá trình dùng ứng dụng',
    action: 'helpCenter',
  },
  {
    id: 'share-app',
    icon: 'share-social-outline',
    title: 'Chia sẻ ứng dụng',
    desc: 'Mời bạn bè tham gia ứng dụng',
    action: 'shareApp',
  },
  {
    id: 'change-password',
    icon: 'lock-closed-outline',
    title: 'Đổi mật khẩu',
    desc: 'Đổi thông tin mật khẩu của bạn',
    action: 'changePassword',
  },
];

function mapPostToReview(post: any): ReviewPost {
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

export default function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const { logout, user } = useAuth();

  const profileUserId = (route.params as { userId?: string } | undefined)?.userId;
  const currentUid = user?.user_id;
  const isOwnProfile = !profileUserId || profileUserId === currentUid;

  const [bio, setBio] = useState('');
  const [displayName, setDisplayName] = useState('Người dùng');
  const [displayUsername, setDisplayUsername] = useState('user');
  const [avatar, setAvatar] = useState('https://i.pravatar.cc/150?img=3');
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [reviewsCount, setReviewsCount] = useState(0);
  const [reviewPosts, setReviewPosts] = useState<ReviewPost[]>([]);
  const [selectedReview, setSelectedReview] = useState<ReviewPost | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      setLoading(true);
      setError('');

      (async () => {
        try {
          if (isOwnProfile) {
            const profile = await getCurrentUserProfile();
            if (!mounted || !profile) {
              return;
            }

            setBio(profile.bio ?? '');
            setDisplayName(profile.full_name ?? 'Người dùng');
            setDisplayUsername(profile.user_name ?? 'user');
            setAvatar(profile.avatar_url ?? 'https://i.pravatar.cc/150?img=3');
            setFollowers(Number(profile.follower_count) || 0);
            setFollowing(Number(profile.following_count) || 0);
            setReviewsCount(Number(profile.review_count) || 0);
            setReviewPosts([]);
            setIsFollowing(false);
            return;
          }

          const uid = profileUserId ?? '';
          const [profile, feed, myFollowings] = await Promise.all([
            getUserProfileById(uid),
            getUserProfileFeed(uid, { pageSize: 50 }),
            getMyFollowings(500),
          ]);

          if (!mounted || !profile) {
            return;
          }

          setBio(profile.bio ?? '');
          setDisplayName(profile.full_name ?? 'Người dùng');
          setDisplayUsername(profile.user_name ?? 'user');
          setAvatar(profile.avatar_url ?? 'https://i.pravatar.cc/150?img=3');
          setFollowers(Number(profile.follower_count) || 0);
          setFollowing(Number(profile.following_count) || 0);
          setReviewsCount(Number(profile.review_count) || 0);
          setIsFollowing(myFollowings.some((item) => item.user_id === uid));
          setReviewPosts(
            feed.items
              .filter((post) => Array.isArray(post.image_urls) && post.image_urls.length > 0)
              .map(mapPostToReview),
          );
        } catch (e) {
          if (!mounted) {
            return;
          }
          setError(e instanceof Error ? e.message : 'Không thể tải hồ sơ');
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      })();

      return () => {
        mounted = false;
      };
    }, [isOwnProfile, profileUserId]),
  );

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('Discover');
  }, [navigation]);

  const openPersonalInfo = useCallback(() => {
    navigation.navigate('PersonalInfo');
  }, [navigation]);

  const openProfileReviews = useCallback(() => {
    navigation.navigate('ProfileReviews', isOwnProfile ? undefined : { userId: profileUserId });
  }, [isOwnProfile, navigation, profileUserId]);

  const goSplash = useCallback(() => {
    void logout();
  }, [logout]);

  const handleMenuPress = useCallback(
    (action: MenuAction) => {
      if (action === 'terms') {
        navigation.navigate('TermsOfUse');
        return;
      }

      if (action === 'helpCenter') {
        navigation.navigate('HelpCenter');
        return;
      }

      if (action === 'shareApp') {
        navigation.navigate('ShareApp');
        return;
      }

      navigation.navigate('ChangePassword');
    },
    [navigation],
  );

  const handleToggleFollow = useCallback(async () => {
    if (isOwnProfile || !profileUserId || followLoading) {
      return;
    }

    setFollowLoading(true);
    try {
      if (isFollowing) {
        await unfollowUser(profileUserId);
        setIsFollowing(false);
        setFollowers((prev) => Math.max(0, prev - 1));
      } else {
        await followUser(profileUserId);
        setIsFollowing(true);
        setFollowers((prev) => prev + 1);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể cập nhật theo dõi');
    } finally {
      setFollowLoading(false);
    }
  }, [followLoading, isFollowing, isOwnProfile, profileUserId]);

  const headerStats = useMemo(
    () => `${followers} người theo dõi · ${following} đang theo dõi · ${reviewsCount} bài đánh giá`,
    [followers, following, reviewsCount],
  );

  if (!isOwnProfile) {
    return (
      <View style={styles.container}>
        <FlatList
          data={reviewPosts}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.visitorContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              <View style={styles.visitorHeaderRow}>
                <TouchableOpacity style={styles.backBtnCircle} activeOpacity={0.8} onPress={handleBack}>
                  <Ionicons name="arrow-back" size={20} color="#fff" />
                </TouchableOpacity>
              </View>

              <View style={styles.visitorProfileBox}>
                <Image source={{ uri: safeImageUri(avatar, DEFAULT_AVATAR_URL) }} style={styles.visitorAvatar} />
                <Text style={styles.visitorName}>{displayName}</Text>
                <Text style={styles.visitorBio} numberOfLines={2}>
                  {bio?.trim() ? bio : 'Chưa có bio.'}
                </Text>
                <Text style={styles.visitorStats}>{headerStats}</Text>
                <TouchableOpacity
                  style={[styles.followBtn, isFollowing ? styles.followingBtn : null]}
                  onPress={handleToggleFollow}
                  activeOpacity={0.85}
                  disabled={followLoading}
                >
                  <Text style={[styles.followBtnText, isFollowing ? styles.followingBtnText : null]}>
                    {followLoading ? 'Đang xử lý...' : isFollowing ? 'Bỏ theo dõi' : 'Theo dõi'}
                  </Text>
                </TouchableOpacity>
              </View>

              {loading ? (
                <View style={styles.centerState}>
                  <ActivityIndicator color="#FFD600" />
                  <Text style={styles.stateText}>Đang tải thông tin...</Text>
                </View>
              ) : null}

              {!loading && error ? (
                <View style={styles.centerState}>
                  <Text style={styles.stateError}>{error}</Text>
                </View>
              ) : null}
            </>
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.gridCard} activeOpacity={0.9} onPress={() => setSelectedReview(item)}>
              <Image source={{ uri: safeImageUri(item.imageUrl) }} style={styles.gridImage} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            !loading && !error ? (
              <Text style={styles.emptyText}>Người dùng chưa có bài đăng nào.</Text>
            ) : null
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
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.contentScroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TopBar
            title="Cá nhân"
            leftIcon="arrow-back"
            onPressLeft={handleBack}
            rightIcon="notifications-outline"
            onPressRight={() => navigation.navigate('Notifications')}
          />
        </View>

        {loading ? (
          <View style={styles.stateWrap}>
            <ActivityIndicator color="#FFD600" />
            <Text style={styles.stateText}>Đang tải thông tin...</Text>
          </View>
        ) : null}

        {!loading && error ? (
          <View style={styles.stateWrap}>
            <Text style={styles.stateError}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.userInfo}>
          <TouchableOpacity style={styles.userProfileArea} activeOpacity={0.8} onPress={openProfileReviews}>
            <Image source={{ uri: safeImageUri(avatar, DEFAULT_AVATAR_URL) }} style={styles.avatar} />
            <View style={styles.userTextWrap}>
              <Text style={styles.name}>{displayName}</Text>
              <Text style={styles.username}>{displayUsername}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.editBioBtn} activeOpacity={0.8} onPress={openPersonalInfo}>
            <Ionicons name="pencil-outline" size={18} color="#181210" />
          </TouchableOpacity>
        </View>
        <Text style={styles.bioText} numberOfLines={2} ellipsizeMode="tail">
          {bio}
        </Text>

        <Text style={styles.sectionLabel}>APP CÀI ĐẶT</Text>
        <View style={styles.sectionBox}>
          {settingItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              activeOpacity={0.7}
              onPress={() => handleMenuPress(item.action)}
            >
              <View style={styles.iconBox}>
                <Ionicons name={item.icon} size={24} color="#FFD600" />
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuDesc}>{item.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color="#888" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.logoutWrap}>
        <TouchableOpacity style={styles.logoutBtn} activeOpacity={0.8} onPress={goSplash}>
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>
      </View>

      <BottomBar activeItem="profile" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181210',
  },
  header: {
    marginBottom: 2,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  userProfileArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#888',
  },
  editBioBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFD600',
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  username: {
    color: '#aaa',
    fontSize: 15,
    marginTop: 2,
  },
  bioText: {
    color: '#8f8f8f',
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 16,
    marginTop: -6,
    marginBottom: 8,
  },
  sectionLabel: {
    color: '#aaa',
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 18,
    marginBottom: 4,
    marginLeft: 16,
    letterSpacing: 1,
  },
  sectionBox: {
    backgroundColor: '#1c1613',
    borderRadius: 12,
    marginHorizontal: 12,
    marginBottom: 8,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#231a17',
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#231a17',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuTextWrap: {
    flex: 1,
  },
  userTextWrap: {
    marginLeft: 16,
  },
  contentScroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  logoutWrap: {
    paddingHorizontal: 32,
    paddingTop: 10,
    paddingBottom: 24,
    backgroundColor: '#181210',
  },
  menuTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  menuDesc: {
    color: '#aaa',
    fontSize: 13,
    marginTop: 2,
  },
  logoutBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#FF3B30',
    borderRadius: 24,
    paddingVertical: 12,
    alignItems: 'center',
  },
  logoutText: {
    color: '#FF3B30',
    fontSize: 17,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  stateWrap: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  stateText: {
    color: '#bbb',
    marginTop: 8,
  },
  stateError: {
    color: '#ff7b7b',
    textAlign: 'center',
    paddingHorizontal: 16,
  },

  visitorContent: {
    paddingHorizontal: 12,
    paddingBottom: 18,
  },
  visitorHeaderRow: {
    paddingTop: 28,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtnCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1f1a17',
    alignItems: 'center',
    justifyContent: 'center',
  },
  visitorProfileBox: {
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 14,
  },
  visitorAvatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#777',
  },
  visitorName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 8,
  },
  visitorBio: {
    color: '#b9b0ac',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 22,
  },
  visitorStats: {
    color: '#c9c2bd',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  followBtn: {
    marginTop: 10,
    height: 36,
    minWidth: 122,
    borderRadius: 18,
    backgroundColor: '#FFD400',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  followBtnText: {
    color: '#181210',
    fontWeight: '700',
  },
  followingBtn: {
    backgroundColor: '#2a2624',
    borderWidth: 1,
    borderColor: '#3e3734',
  },
  followingBtnText: {
    color: '#fff',
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  gridCard: {
    width: '49.2%',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#201a17',
  },
  gridImage: {
    width: '100%',
    aspectRatio: 1,
  },
  emptyText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 10,
  },
  centerState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
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