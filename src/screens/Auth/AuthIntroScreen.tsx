import React from 'react';
import {
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
} from 'react-native';
import {AppText} from '../../components/AppText';
import { useTheme } from '../../hooks/useTheme';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootNavigator';

export default function AuthIntroScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
    type NavigationProp = NativeStackNavigationProp<RootStackParamList,'AuthIntro'>

  return (
    <View style={[styles.container, { backgroundColor: '#000' }]}>
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
        style={[styles.primaryBtn, { backgroundColor: theme.colors.primary }]}
        onPress={() => navigation.navigate('Login')}
      >
        <AppText variant="P1_Medium">Đăng nhập</AppText>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.outlineBtn}
        onPress={() => navigation.navigate('Register')}
        >
        <AppText variant="P1_Medium" style={{ color: theme.colors.background }}>
          Đăng ký
        </AppText>
      </TouchableOpacity>
      <AppText variant="P4_Regular" style={styles.addText} >
        - - - - - - - - - - - - - - - - - - -Đăng nhập nhanh với- - - - - - - - - - - - - - - - - - -
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
    padding: 24,
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: 300,
    marginBottom: 24,
  },
  title: {
    textAlign: 'center',
    marginBottom: 12,
    color: '#fff',
  },
  desc: {
    textAlign: 'center',
    marginBottom: 32,
    color: '#aaa',
  },
  primaryBtn: {
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  outlineBtn: {
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addText: {
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
    color: '#c0c0c0',
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
   btnText: {
    color: '#fff',
  },
});
