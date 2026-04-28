import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
} from 'react-native';
import { AppText } from '../../components/AppText';
import { useTheme } from '../../hooks/useTheme';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { Toggle } from '../../components/Toggle';
import { useAuth } from '../../context/AuthContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export default function LoginScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { login, loginWithGoogle } = useAuth();

  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      setError('Vui lòng nhập đầy đủ tài khoản và mật khẩu');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await login({
        identifier: identifier.trim(),
        password,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Đăng nhập thất bại';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setGoogleLoading(true);

    try {
      await loginWithGoogle();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Đăng nhập Google thất bại';
      setError(message);
    } finally {
      setGoogleLoading(false);
    }
  };
  return (
    <View style={[styles.container, { backgroundColor: '#000' }]}>
      <View style={styles.content}>
        <Image
          source={require('../../assets/icons/Logo.png')}
          style={styles.logo}
        />
        <AppText variant="H3" style={styles.title}>
          Đăng nhập
        </AppText>
      </View>

      <View style={styles.form}>
        <AppText variant="H7" style={{ color: theme.colors.background, marginBottom: 8 }}>
          Tên đăng nhập
        </AppText>
        <TextInput
          placeholder="Tên đăng nhập"
          placeholderTextColor="#666"
          value={identifier}
          onChangeText={setIdentifier}
          style={styles.input}
          autoCapitalize="none"
        />

        <AppText variant="H7" style={{ color: theme.colors.background, marginBottom: 8 }}>
          Mật khẩu
        </AppText>

        <View style={styles.passwordWrapper}>
          <TextInput
            placeholder="Nhập mật khẩu"
            placeholderTextColor="#666"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            style={[styles.input, { paddingRight: 48 }]}
          />
          <TouchableOpacity
            style={styles.eyeBtn}
            onPress={() => setShowPassword(!showPassword)}
            activeOpacity={0.7}
          >
            <AppText style={{ color: '#999', fontSize: 16 }}>
              {showPassword ? '🙈' : '👁️'}
            </AppText>
          </TouchableOpacity>
        </View>

        <View style={styles.rowBetween}>
          <TouchableOpacity
            style={styles.rememberRow}
            onPress={() => setRemember(!remember)}
            activeOpacity={0.7}
          >
            <Toggle type='checkbox' checked={remember} />
            <AppText variant="P4_Regular" style={{ color: theme.colors.background, marginLeft: 6 }}>
              Lưu mật khẩu
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
            <AppText variant="P4_Regular" style={{ color: theme.colors.primary }}>
              Quên mật khẩu?
            </AppText>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content2}>
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: theme.colors.primary, opacity: loading ? 0.7 : 1 }]}
          onPress={handleLogin}
          disabled={loading}
        >
          <AppText variant="P1_Medium">{loading ? 'Đang đăng nhập...' : 'Đăng nhập'}</AppText>
        </TouchableOpacity>

        {error ? (
          <AppText variant="P4_Regular" style={styles.errorText}>
            {error}
          </AppText>
        ) : null}

       <View style={styles.rowCenter}>
        <AppText variant="H6" style={[styles.addText, { color: theme.colors.background, marginTop: 0 }]}>
          Bạn chưa có tài khoản?
        </AppText>

        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <AppText
            variant="H6"
            style={{ color: theme.colors.primary, marginLeft: 6, lineHeight: 24 }}
          >
            Đăng ký ngay
          </AppText>
        </TouchableOpacity>
      </View>

        <AppText variant="P4_Regular" style={styles.addText}>
          - - - - - - - - - - - - - - - - - - - - - Đăng ký nhanh với - - - - - - - - - - - - - - - - - - - - -
        </AppText>

        <TouchableOpacity
          style={[styles.outlineBtn, { opacity: googleLoading ? 0.7 : 1 }]}
          onPress={handleGoogleLogin}
          disabled={googleLoading}
        >
          <View style={styles.btnContent}>
            <Image
              source={require('../../assets/icons/Google__G__logo.svg.png')}
              style={styles.icon}
              resizeMode="contain"
            />
            <AppText variant="P1_Medium" style={styles.btnText}>
              {googleLoading ? 'Đang đăng nhập...' : 'Google'}
            </AppText>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  content: {
    marginTop: -134,
    alignItems: 'center',
  },
  logo: {
    width: 72,
    height: 72,
    marginBottom: 24,
    borderRadius: 12,
  },
  form: {
    marginBottom: 60,
  },
  title: {
    textAlign: 'center',
    marginBottom: 32,
    color: '#fff',
  },
  input: {
    height: 50,
    backgroundColor: '#1c1c1c',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    color: '#fff',
  },
  content2: {
    marginTop: 30,
    marginBottom: -160,
  },
  primaryBtn: {
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outlineBtn: {
    marginTop: 20,
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
    color: '#c0c0c0',
  },
  errorText: {
    color: '#ff7b7b',
    textAlign: 'center',
    marginTop: 12,
  },
  rowCenter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
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

  passwordWrapper: {
    position: 'relative',
  },
  eyeBtn: {
    position: 'absolute',
    right: 16,
    top: 0,
    height: 50,
    justifyContent: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: -6,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
 
  
});
