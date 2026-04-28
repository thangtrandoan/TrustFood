import React, { useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootNavigator';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const channels = [
  { id: 'copy', icon: 'copy-outline', title: 'Sao chép liên kết', desc: 'Dán liên kết ở bất kỳ đâu bạn muốn.' },
  { id: 'messenger', icon: 'chatbubble-ellipses-outline', title: 'Chia sẻ qua Messenger', desc: 'Gửi nhanh cho bạn bè qua Messenger.' },
  { id: 'zalo', icon: 'paper-plane-outline', title: 'Chia sẻ qua Zalo', desc: 'Mời bạn bè trải nghiệm bằng Zalo.' },
  { id: 'email', icon: 'mail-outline', title: 'Chia sẻ qua Email', desc: 'Gửi lời mời qua địa chỉ email.' },
] as const satisfies Array<{
  id: string;
  icon: IconName;
  title: string;
  desc: string;
}>;

export default function ShareAppScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('Profile');
  }, [navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back-outline" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Chia sẻ ứng dụng</Text>
      </View>

      <View style={styles.heroCard}>
        <Ionicons name="people-outline" size={22} color="#FFD15C" />
        <Text style={styles.heroText}>Mời bạn bè dùng thử ứng dụng và cùng nhau khám phá món ngon.</Text>
      </View>

      <View style={styles.list}>
        {channels.map((item) => (
          <TouchableOpacity key={item.id} style={styles.row} activeOpacity={0.85}>
            <View style={styles.rowLeading}>
              <View style={styles.iconCircle}>
                <Ionicons name={item.icon} size={18} color="#FFD15C" />
              </View>
              <View style={styles.rowTextWrap}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={styles.rowDesc}>{item.desc}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8e8e8e" />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0b09',
  },
  header: {
   flexDirection: 'row',
		alignItems: 'center',
		paddingTop: 36,
		paddingBottom: 12,
		paddingHorizontal: 16,
		backgroundColor: 'transparent',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1613',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2f261d',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    gap: 10,
  },
  heroText: {
    color: '#dfd7ce',
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  list: {
    backgroundColor: '#16120f',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2d241d',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2421',
  },
  rowLeading: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#2a231b',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  rowTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  rowTitle: {
    color: '#f0f0f0',
    fontSize: 15,
    fontWeight: '700',
  },
  rowDesc: {
    color: '#a99f95',
    fontSize: 13,
    marginTop: 4,
  },
});
