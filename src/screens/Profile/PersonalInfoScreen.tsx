import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, View, Text, StyleSheet, TouchableOpacity, Image, TextInput } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { getCurrentUserProfile, updateProfile } from '../../services/firebase';
import { DEFAULT_AVATAR_URL } from '../../services/firebase/constants';
import { openPhoneGallery } from '../../utils/galleryHelper';
import { safeImageUri } from '../../utils/imageSource';
import TopBar from '../../components/TopBar';

export default function PersonalInfoScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [profile, setProfile] = useState(() => ({
    avatar: 'https://i.pravatar.cc/150?img=3',
    username: 'user',
    name: '',
    followers: 0,
    following: 0,
    reviews: 0,
    bio: '',
  }));
  const [bio, setBio] = useState(profile.bio);
  const [name, setName] = useState(profile.name);
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const current = await getCurrentUserProfile();
        if (!mounted || !current) {
          return;
        }

        const next = {
          avatar: current.avatar_url,
          username: current.user_name,
          name: current.full_name,
          followers: Number(current.follower_count) || 0,
          following: Number(current.following_count) || 0,
          reviews: Number(current.review_count) || 0,
          bio: current.bio,
        };
        setProfile(next);
        setName(next.name);
        setBio(next.bio);
      } catch {
        if (mounted) {
          setError('Không thể tải thông tin người dùng');
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('Profile');
  }, [navigation]);

  const handleBioChange = useCallback((nextBio: string) => {
    setBio(nextBio);
  }, []);

  const handleAvatarSelected = useCallback(async (avatarLocalPath: string) => {
    setError('');
    setAvatarLoading(true);

    try {
      const next = await updateProfile({ avatarLocalPath });
      setProfile((prev) => ({
        ...prev,
        avatar: next.avatar_url,
        username: next.user_name,
        name: next.full_name,
        followers: Number(next.follower_count) || 0,
        following: Number(next.following_count) || 0,
        reviews: Number(next.review_count) || 0,
        bio: next.bio,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể cập nhật ảnh đại diện');
    } finally {
      setAvatarLoading(false);
    }
  }, []);

  const handlePickAvatar = useCallback(() => {
    if (loading || avatarLoading) {
      return;
    }

    void openPhoneGallery((uri) => {
      void handleAvatarSelected(uri);
    });
  }, [avatarLoading, handleAvatarSelected, loading]);

  const handleCompleteEdit = useCallback(async () => {
    if (!name.trim()) {
      setError('Vui lòng nhập tên');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const next = await updateProfile({
        fullName: name.trim(),
        bio,
      });
      setProfile((prev) => ({
        ...prev,
        name: next.full_name,
        username: next.user_name,
        followers: Number(next.follower_count) || 0,
        following: Number(next.following_count) || 0,
        reviews: Number(next.review_count) || 0,
        bio: next.bio,
        avatar: next.avatar_url,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể cập nhật hồ sơ');
      setLoading(false);
      return;
    }

    setLoading(false);

    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('Profile');
  }, [bio, name, navigation]);

  const headerStats = useMemo(
    () => `${profile.followers} người theo dõi · ${profile.following} đang theo dõi · ${profile.reviews} bài đánh giá`,
    [profile.followers, profile.following, profile.reviews],
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TopBar title="Cá nhân" leftIcon="arrow-back" onPressLeft={handleBack} showRight={false} />
      </View>

      <View style={styles.profileWrap}>
        <View style={styles.avatarWrap}>
          <Image source={{ uri: safeImageUri(profile.avatar, DEFAULT_AVATAR_URL) }} style={styles.avatar} />
          <TouchableOpacity
            style={[styles.badge, (loading || avatarLoading) && styles.badgeDisabled]}
            onPress={handlePickAvatar}
            activeOpacity={0.85}
            disabled={loading || avatarLoading}
          >
            {avatarLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="camera" size={14} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
        <Text style={styles.name}>{profile.name || 'Người dùng'}</Text>
        <Text style={styles.username}>{profile.username}</Text>
        <Text style={styles.stats}>{headerStats}</Text>
      </View>

      <View style={styles.separator} />

      <Text style={styles.sectionLabel}>Thông tin cá nhân</Text>

      <View style={styles.fieldWrap}>
        <Text style={styles.fieldLabel}>Sửa tiểu sử</Text>
        <TextInput
          value={bio}
          onChangeText={handleBioChange}
          multiline
          textAlignVertical="top"
          style={styles.bioInput}
          placeholder="Nhập tiểu sử của bạn"
          placeholderTextColor="#9d9d9d"
        />
      </View>

      <View style={styles.fieldWrap}>
        <Text style={styles.fieldLabel}>Tên của bạn</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          style={styles.inputEdit}
          placeholder="Nhập tên"
          placeholderTextColor="#9d9d9d"
        />
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.deleteBtn, { opacity: loading ? 0.7 : 1 }]}
        activeOpacity={0.85}
        onPress={handleCompleteEdit}
        disabled={loading}
      >
        <Text style={styles.deleteText}>{loading ? 'Đang cập nhật...' : 'Hoàn tất chỉnh sửa'}</Text>
      </TouchableOpacity>
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
  profileWrap: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 12,
  },
  avatarWrap: {
    position: 'relative',
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
  badge: {
    position: 'absolute',
    right: -2,
    bottom: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFC400',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0f0b09',
  },
  badgeDisabled: {
    opacity: 0.7,
  },
  username: {
    color: '#9f938d',
    fontSize: 19,
    marginTop: 2,
  },
  stats: {
    color: '#d7cbc5',
    fontSize: 15,
    marginTop: 10,
    textAlign: 'center',
  },
  separator: {
    height: 1,
    backgroundColor: '#231916',
    marginBottom: 14,
  },
  sectionLabel: {
    paddingLeft: 16,
    paddingRight: 16,
    color: '#6f6f6f',
    fontSize: 15,
    marginTop: 8,
    marginBottom: 18,
    fontWeight: '600',
  },
  fieldWrap: {
    marginBottom: 20,
    paddingLeft: 16,
    paddingRight: 16,
  },
  fieldLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  inputEdit: {
    backgroundColor: '#5a5a5a',
    borderRadius: 28,
    minHeight: 54,
    paddingHorizontal: 18,
    justifyContent: 'center',
    color: '#f2f2f2',
    fontSize: 16,
  },
  bioInput: {
    backgroundColor: '#5a5a5a',
    borderRadius: 18,
    minHeight: 94,
    paddingHorizontal: 18,
    paddingVertical: 14,
    color: '#f2f2f2',
    fontSize: 16,
    lineHeight: 22,
  },
  deleteBtn: {
    paddingLeft: 16,
    paddingRight: 16,
    marginTop: 'auto',
    marginBottom: 30,
    borderWidth: 1.5,
    borderColor: '#FF3030',
    borderRadius: 28,
    paddingVertical: 14,
    alignItems: 'center',
  },
  errorText: {
    color: '#ff7b7b',
    marginTop: -8,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  deleteText: {
    color: '#FF3030',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
