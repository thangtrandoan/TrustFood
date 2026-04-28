import React, { useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootNavigator';

const helpItems = [
  { id: 'posting', title: 'Cách tạo bài đăng đánh giá món ăn', desc: 'Hướng dẫn đăng ảnh, chọn địa điểm và chấm điểm.' },
  { id: 'report', title: 'Cách báo lỗi và liên hệ hỗ trợ', desc: 'Gửi phản hồi để đội ngũ xử lý nhanh hơn.' },
  { id: 'privacy', title: 'Quản lý quyền riêng tư tài khoản', desc: 'Kiểm soát ai có thể xem nội dung của bạn.' },
  { id: 'notify', title: 'Câu hỏi về thông báo', desc: 'Tùy chỉnh tần suất và loại thông báo nhận được.' },
];

export default function HelpCenterScreen() {
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
        <Text style={styles.title}>Trung tâm trợ giúp</Text>
      </View>

      <View style={styles.heroCard}>
        <Ionicons name="help-buoy-outline" size={22} color="#FFD15C" />
        <Text style={styles.heroText}>Chọn mục bạn cần, chúng tôi sẽ hỗ trợ theo từng vấn đề cụ thể.</Text>
      </View>

      <View style={styles.list}>
        {helpItems.map((item) => (
          <TouchableOpacity key={item.id} style={styles.row} activeOpacity={0.85}>
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowTitle}>{item.title}</Text>
              <Text style={styles.rowDesc}>{item.desc}</Text>
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
