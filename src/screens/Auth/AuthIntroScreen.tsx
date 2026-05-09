import React from 'react';
import {
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { AppText } from '../../components/AppText';
import { useTheme } from '../../hooks/useTheme';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootNavigator';

const { width, height } = Dimensions.get('window');
const baseWidth = 375;

const scale = (size: number) => (width / baseWidth) * size;

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'AuthIntro'
>;

export default function AuthIntroScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/images/Background_2.png')}
        style={styles.image}
        resizeMode="contain"
      />

      <AppText variant="H1" style={styles.title}>
        Khám phá món ngon{"\n"}quanh bạn
      </AppText>

      <AppText variant="H6" style={styles.desc}>
        Chỉ cần một tấm ảnh, món ăn của bạn có thể
        truyền cảm hứng cho hàng ngàn người.
      </AppText>

      <TouchableOpacity
        style={[
          styles.primaryBtn,
          { backgroundColor: theme.colors.primary },
        ]}
        onPress={() => navigation.navigate('Login')}
      >
        <AppText variant="P1_Medium">Đăng nhập</AppText>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.outlineBtn}
        onPress={() => navigation.navigate('Register')}
      >
        <AppText
          variant="P1_Medium"
          style={{ color: theme.colors.background }}
        >
          Đăng ký
        </AppText>
      </TouchableOpacity>

      <AppText variant="P4_Regular" style={styles.addText}>
        ───────── Đăng nhập nhanh với ─────────
      </AppText>

      <TouchableOpacity style={styles.outlineBtn}>
        <View style={styles.btnContent}>
          <Image
            source={require('../../assets/icons/Google__G__logo.svg.png')}
            style={styles.icon}
            resizeMode="contain"
          />
          <AppText variant="P1_Medium" style={styles.btnText}>
            Google
          </AppText>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingHorizontal: scale(20),
    paddingVertical: scale(24),
    justifyContent: 'center',
  },

  image: {
    width: '100%',
    height: height * 0.3, // responsive theo chiều cao
    marginBottom: scale(20),
  },

  title: {
    textAlign: 'center',
    marginBottom: scale(12),
    color: '#fff',
    paddingHorizontal: scale(10),
  },

  desc: {
    textAlign: 'center',
    marginBottom: scale(28),
    color: '#aaa',
    paddingHorizontal: scale(16),
    lineHeight: scale(20),
  },

  primaryBtn: {
    height: scale(56),
    borderRadius: scale(28),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scale(14),
  },

  outlineBtn: {
    height: scale(56),
    borderRadius: scale(28),
    borderWidth: 1,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scale(12),
  },

  addText: {
    textAlign: 'center',
    marginVertical: scale(18),
    color: '#c0c0c0',
    fontSize: scale(12),
  },

  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  icon: {
    width: scale(20),
    height: scale(20),
    marginRight: scale(8),
  },

  btnText: {
    color: '#fff',
  },
});