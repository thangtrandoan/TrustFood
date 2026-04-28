import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import BottomBar from '../../components/BottomBar';
import TopBar from '../../components/TopBar';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { useAuth } from '../../context/AuthContext';
import { DEFAULT_AVATAR_URL } from '../../services/firebase/constants';
import {
  followUser,
  getMyFollowers,
  getMyFollowings,
  searchUsersByPrefix,
  unfollowUser,
  type AppUserProfile,
  type FollowListItem,
} from '../../services/firebase';
import { safeImageUri } from '../../utils/imageSource';

type TabKey = 'following' | 'followers';

type Friend = {
  id: string;
  name: string;
  avatar: string;
};

function ListSeparator() {
  return <View style={styles.separator} />;
}

export default function FriendsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const currentUid = user?.user_id ?? '';

  const [activeTab, setActiveTab] = useState<TabKey>('following');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const [followingData, setFollowingData] = useState<Friend[]>([]);
  const [followersData, setFollowersData] = useState<Friend[]>([]);
  const [searchResults, setSearchResults] = useState<Friend[]>([]);

  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchError, setSearchError] = useState('');
  const [actionLoadingUserId, setActionLoadingUserId] = useState('');

  const listData = useMemo(() => {
    return activeTab === 'following' ? followingData : followersData;
  }, [activeTab, followersData, followingData]);

  const mapFollowData = useCallback((items: FollowListItem[]): Friend[] => {
    return items.map((item) => ({
      id: item.user_id,
      name: item.user_name,
      avatar: item.avatar_url || 'https://i.pravatar.cc/150?img=47',
    }));
  }, []);

  const refreshRelationshipData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [followings, followers] = await Promise.all([getMyFollowings(100), getMyFollowers(100)]);
      setFollowingData(mapFollowData(followings));
      setFollowersData(mapFollowData(followers));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể tải danh sách bạn bè');
    } finally {
      setLoading(false);
    }
  }, [mapFollowData]);

  useEffect(() => {
    void refreshRelationshipData();
  }, [refreshRelationshipData]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchInput.trim());
    }, 400);

    return () => {
      clearTimeout(timer);
    };
  }, [searchInput]);

  useEffect(() => {
    if (!debouncedQuery) {
      setSearchResults([]);
      setSearchError('');
      return;
    }

    let mounted = true;

    (async () => {
      setSearchLoading(true);
      setSearchError('');
      try {
        const users = await searchUsersByPrefix(debouncedQuery, 20);
        if (!mounted) {
          return;
        }
        setSearchResults(
          users.map((user: AppUserProfile) => ({
            id: user.user_id,
            name: user.user_name,
            avatar: user.avatar_url || 'https://i.pravatar.cc/150?img=47',
          })).filter((user) => user.id !== currentUid),
        );
      } catch (e) {
        if (!mounted) {
          return;
        }
        setSearchError(e instanceof Error ? e.message : 'Không thể tìm kiếm');
      } finally {
        if (mounted) {
          setSearchLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [currentUid, debouncedQuery]);

  const onSearchPress = () => {
    setIsSearchOpen(true);
  };

  const onBackPress = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('Profile');
  };

  const onCloseSearch = () => {
    setIsSearchOpen(false);
    setSearchInput('');
    setDebouncedQuery('');
    setSearchResults([]);
    setSearchError('');
  };

  const onFollow = async (userId: string) => {
    if (actionLoadingUserId) {
      return;
    }

    setActionLoadingUserId(userId);
    try {
      await followUser(userId);
      await refreshRelationshipData();
    } catch (e) {
      Alert.alert('Lỗi', e instanceof Error ? e.message : 'Không thể theo dõi');
    } finally {
      setActionLoadingUserId('');
    }
  };

  const onUnfollow = async (userId: string) => {
    if (actionLoadingUserId) {
      return;
    }

    setActionLoadingUserId(userId);
    try {
      await unfollowUser(userId);
      await refreshRelationshipData();
    } catch (e) {
      Alert.alert('Lỗi', e instanceof Error ? e.message : 'Không thể bỏ theo dõi');
    } finally {
      setActionLoadingUserId('');
    }
  };

  const onOpenConversation = (item: Friend) => {
    navigation.navigate('ChatConversation', {
      userId: item.id,
      name: item.name,
      avatar: item.avatar,
    });
  };

  const renderActions = (item: Friend, mode: 'unfollow' | 'followBack' | 'follow') => {
    const disabled = actionLoadingUserId === item.id;

    if (mode === 'followBack') {
      return (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.yellowButton, disabled && styles.actionDisabled]}
            onPress={() => onFollow(item.id)}
            disabled={disabled}
          >
            <Text style={styles.yellowButtonText}>{disabled ? 'Đang xử lý...' : 'Theo dõi lại'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconActionButton, disabled && styles.actionDisabled]}
            onPress={() => onUnfollow(item.id)}
            disabled={disabled}
          >
            <Ionicons name="close" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      );
    }

    if (mode === 'unfollow') {
      return (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.yellowButton, disabled && styles.actionDisabled]}
            onPress={() => onOpenConversation(item)}
            disabled={disabled}
          >
            <Text style={styles.yellowButtonText}>Nhắn tin</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconActionButton, disabled && styles.actionDisabled]}
            onPress={() => onUnfollow(item.id)}
            disabled={disabled}
          >
            <Ionicons name="close" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <TouchableOpacity
        style={[styles.smallYellowButton, disabled && styles.actionDisabled]}
        onPress={() => onFollow(item.id)}
        disabled={disabled}
      >
        <Text style={styles.smallYellowButtonText}>{disabled ? 'Đang xử lý...' : 'Theo dõi'}</Text>
      </TouchableOpacity>
    );
  };

  const renderFriendItem = ({ item }: { item: Friend }) => {
    const isFollowing = followingData.some((f) => f.id === item.id);
    const mode = activeTab === 'followers' ? (isFollowing ? 'unfollow' : 'followBack') : 'unfollow';

    return (
      <View style={styles.itemRow}>
        <TouchableOpacity
          style={styles.userInfo}
          onPress={() => navigation.navigate('Profile', { userId: item.id })}
          activeOpacity={0.8}
        >
          <Image source={{ uri: safeImageUri(item.avatar, DEFAULT_AVATAR_URL) }} style={styles.avatar} />
          <Text style={styles.userName}>{item.name}</Text>
        </TouchableOpacity>

        {renderActions(item, mode)}
      </View>
    );
  };

  const renderSearchItem = ({ item }: { item: Friend }) => {
    const isFollowing = followingData.some((f) => f.id === item.id);
    const mode: 'follow' | 'unfollow' = isFollowing ? 'unfollow' : 'follow';

    return (
      <View style={styles.itemRow}>
        <TouchableOpacity
          style={styles.userInfo}
          onPress={() => navigation.navigate('Profile', { userId: item.id })}
          activeOpacity={0.8}
        >
          <Image source={{ uri: safeImageUri(item.avatar, DEFAULT_AVATAR_URL) }} style={styles.avatar} />
          <Text style={styles.userName}>{item.name}</Text>
        </TouchableOpacity>
        {renderActions(item, mode)}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {!isSearchOpen ? (
        <TopBar title="Bạn bè" leftIcon="arrow-back" onPressLeft={onBackPress} rightIcon="search-outline" onPressRight={onSearchPress} />
      ) : null}

      <View style={styles.content}>
        {isSearchOpen ? (
          <View style={styles.searchRowWrap}>
            <View style={styles.searchRow}>
              <TouchableOpacity style={styles.backSearchButton} onPress={onCloseSearch}>
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>

              <View style={styles.searchInputWrap}>
                <Ionicons name="search-outline" size={20} color="#A6A6A6" />
                <TextInput
                  value={searchInput}
                  onChangeText={setSearchInput}
                  placeholder="Tìm bạn bè"
                  placeholderTextColor="#8E8A89"
                  style={styles.searchInput}
                  autoCorrect={false}
                  autoCapitalize="none"
                  returnKeyType="search"
                />
              </View>
            </View>
          </View>
        ) : null}

        {loading ? (
          <ActivityIndicator color="#F8C819" style={styles.searchLoader} />
        ) : null}

        {!loading && error ? <Text style={styles.errorText}>{error}</Text> : null}

        {isSearchOpen ? (
          <>
            {searchLoading ? <ActivityIndicator color="#F8C819" style={styles.searchLoader} /> : null}
            {searchError ? <Text style={styles.errorText}>{searchError}</Text> : null}
            {!searchLoading && debouncedQuery.length > 0 && searchResults.length === 0 ? (
              <Text style={styles.emptyText}>Không tìm thấy kết quả phù hợp.</Text>
            ) : null}
            {!searchLoading && searchResults.length > 0 ? (
              <FlatList
                data={searchResults}
                keyExtractor={(item) => `search-${item.id}`}
                renderItem={renderSearchItem}
                contentContainerStyle={styles.listContainer}
                ItemSeparatorComponent={ListSeparator}
                showsVerticalScrollIndicator={false}
              />
            ) : null}
          </>
        ) : (
          <>
            <View style={styles.tabsWrap}>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'following' && styles.tabButtonActive]}
                onPress={() => setActiveTab('following')}
              >
                <Text style={[styles.tabText, activeTab === 'following' && styles.tabTextActive]}>Đang theo dõi</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'followers' && styles.tabButtonActive]}
                onPress={() => setActiveTab('followers')}
              >
                <Text style={[styles.tabText, activeTab === 'followers' && styles.tabTextActive]}>Người theo dõi</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={listData}
              keyExtractor={(item) => item.id}
              renderItem={renderFriendItem}
              contentContainerStyle={styles.listContainer}
              ItemSeparatorComponent={ListSeparator}
              showsVerticalScrollIndicator={false}
              refreshing={loading}
              onRefresh={refreshRelationshipData}
            />
          </>
        )}
      </View>

      <BottomBar activeItem="social" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0706',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  searchRowWrap: {
    paddingTop: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 14,
  },
  backSearchButton: {
    marginRight: 10,
    paddingVertical: 6,
    paddingRight: 4,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F1B1A',
    borderRadius: 26,
    paddingHorizontal: 14,
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#302A29',
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 8,
    paddingVertical: 8,
  },
  tabsWrap: {
    backgroundColor: '#1A1615',
    borderRadius: 30,
    padding: 4,
    flexDirection: 'row',
    marginBottom: 18,
  },
  tabButton: {
    flex: 1,
    borderRadius: 25,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#FFD14A',
  },
  tabText: {
    color: '#B7B0AE',
    fontWeight: '700',
  },
  tabTextActive: {
    color: '#201B18',
  },
  listContainer: {
    paddingBottom: 24,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 10,
    backgroundColor: '#555',
  },
  userName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: '#2A2320',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  yellowButton: {
    backgroundColor: '#FFD14A',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
  },
  yellowButtonText: {
    color: '#211C19',
    fontWeight: '700',
    fontSize: 12,
  },
  iconActionButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#38302D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  darkActionButton: {
    backgroundColor: '#312926',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  darkActionText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  smallYellowButton: {
    backgroundColor: '#FFD14A',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  smallYellowButtonText: {
    color: '#211C19',
    fontWeight: '700',
    fontSize: 12,
  },
  actionDisabled: {
    opacity: 0.65,
  },
  emptyText: {
    color: '#aaa',
    textAlign: 'center',
    marginTop: 16,
  },
  searchLoader: {
    marginVertical: 12,
  },
  errorText: {
    color: '#ff7b7b',
    textAlign: 'center',
    marginBottom: 10,
  },
});
