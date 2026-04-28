import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootNavigator';

const terms = [
  {
    id: '1',
    title: 'Nội dung đăng tải',
    text: 'Bạn chịu trách nhiệm cho hình ảnh, bình luận và đánh giá được đăng lên ứng dụng.',
  },
  {
    id: '2',
    title: 'Hành vi sử dụng',
    text: 'Không đăng nội dung gây hại, xúc phạm hoặc vi phạm quy định pháp luật hiện hành.',
  },
  {
    id: '3',
    title: 'Dữ liệu cá nhân',
    text: 'Thông tin tài khoản được dùng để cung cấp tính năng và cải thiện trải nghiệm.',
  },
  {
    id: '4',
    title: 'Cập nhật điều khoản',
    text: 'Điều khoản có thể được cập nhật theo từng phiên bản ứng dụng và sẽ thông báo khi thay đổi lớn.',
  },
];

export default function TermsOfUseScreen() {
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
        <Text style={styles.title}>Điều khoản sử dụng</Text>
      </View>

      <View style={styles.heroCard}>
        <Ionicons name="document-text-outline" size={22} color="#FFD15C" />
        <Text style={styles.heroText}>Vui lòng đọc kỹ trước khi tiếp tục sử dụng ứng dụng.</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {terms.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardText}>{item.text}</Text>
          </View>
        ))}
        
      </ScrollView>
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
  content: {
    paddingBottom: 28,
    gap: 10,
  },
  card: {
    backgroundColor: '#15110e',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2d241d',
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  cardTitle: {
    color: '#FFD87C',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  cardText: {
    color: '#ece2d6',
    fontSize: 15,
    lineHeight: 22,
  },
});
