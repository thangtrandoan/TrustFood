import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  TextInput,
} from 'react-native';
import { AppText } from '../../components/AppText';
import { useTheme } from '../../hooks/useTheme';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { useAuth } from '../../context/AuthContext';
import auth from '@react-native-firebase/auth';
import {
  completeRegistrationProfile,
  createUsernameCandidate,
  sendEmailVerificationAgain,
  signUpWithEmail,
} from '../../services/firebase';

export default function RegisterScreen() {
  const theme = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList, 'Register'>>();
  const { loginWithGoogle } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [userName, setUserName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const validateEmail = (value: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(value);
  };

  const handleContinue = async () => {
    if (!validateEmail(email)) {
      setError('Email không hợp lệ');
      return;
    }

    if (password.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự');
      return;
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu nhập lại không khớp');
      return;
    }

    if (!name.trim()) {
      setError('Vui lòng nhập tên');
      return;
    }

    const nameSeed = name.trim();
    const finalUserName = userName.trim() || createUsernameCandidate(nameSeed, email.trim());
    if (!/^[a-zA-Z0-9_]{4,20}$/.test(finalUserName)) {
      setError('Username chi duoc dung chu, so, _, do dai 4-20 ky tu');
      return;
    }

    setError('');
    setLoading(true);

    let createdUid: string | null = null;

    try {
      const credential = await signUpWithEmail(email.trim(), password);
      const uid = credential.user?.uid;
      if (!uid) {
        throw new Error('Không thể tạo tài khoản');
      }

      createdUid = uid;
      await completeRegistrationProfile({
        userName: finalUserName,
        fullName: name.trim(),
        email: credential.user?.email ?? email.trim(),
        authProvider: 'password',
        emailVerified: credential.user?.emailVerified ?? false,
      });
      try {
        await sendEmailVerificationAgain();
      } catch {
        // Don't block registration if verification email fails to send.
      }

      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (e) {
      if (createdUid) {
        await auth().currentUser?.delete().catch(() => undefined);
      }
      const message = e instanceof Error ? e.message : 'Không thể tạo tài khoản';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setGoogleLoading(true);

    try {
      await loginWithGoogle();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Đăng ký Google thất bại';
      setError(message);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <Image
          source={require('../../assets/icons/Logo.png')}
          style={styles.logo}
        />

        <AppText variant="H3" style={styles.title}>
          Đăng ký
        </AppText>

        <>
          <AppText style={styles.label}>Email</AppText>
          <TextInput
            placeholder="Email của bạn"
            placeholderTextColor="#666"
            value={email}
            onChangeText={setEmail}
            style={[styles.input, error && styles.inputError]}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </>

        <AppText style={styles.label}>Mật khẩu</AppText>
        <TextInput
          placeholder="Nhập mật khẩu"
          placeholderTextColor="#666"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={[styles.input, error && styles.inputError]}
        />

        <AppText style={styles.label}>Nhập lại mật khẩu</AppText>
        <TextInput
          placeholder="Nhập lại mật khẩu"
          placeholderTextColor="#666"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          style={[styles.input, error && styles.inputError]}
        />

        <AppText style={styles.subText}>Mật khẩu tối thiểu 8 ký tự</AppText>

        <AppText style={styles.label}>Tên hiển thị</AppText>
        <TextInput
          placeholder="Tên của bạn"
          placeholderTextColor="#666"
          value={name}
          onChangeText={setName}
          style={[styles.input, error && styles.inputError]}
        />

        <AppText style={styles.label}>Username</AppText>
        <TextInput
          placeholder="Username (4-20 ky tu, chu/so/_)"
          placeholderTextColor="#666"
          value={userName}
          onChangeText={setUserName}
          autoCapitalize="none"
          style={[styles.input, error && styles.inputError]}
        />

        {error ? <AppText style={styles.error}>{error}</AppText> : null}

        <TouchableOpacity
          style={[
            styles.primaryBtn,
            {
              backgroundColor: theme.colors.primary,
              opacity: loading ? 0.6 : 1,
            },
          ]}
          disabled={loading}
          onPress={handleContinue}
        >
          <AppText variant="P1_Medium">{loading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}</AppText>
        </TouchableOpacity>

        <AppText variant="P4_Regular" style={styles.addText}>
          - - - - - - - - - - - - - - - - - - - -Đăng nhập nhanh với- - - - - - - - - - - - - - - - - - - - 
        </AppText>

        <TouchableOpacity
          style={[styles.outlineBtn, { opacity: googleLoading ? 0.7 : 1 }]}
          onPress={handleGoogle}
          disabled={googleLoading}
        >
          <View style={styles.btnContent}>
            <Image
              source={require('../../assets/icons/Google__G__logo.svg.png')}
              style={styles.icon}
              resizeMode="contain"
            />
            <AppText variant="P1_Medium" style={styles.btnText}>
              {googleLoading ? 'Đang đăng ký...' : 'Google'}
            </AppText>
          </View>
        </TouchableOpacity>

        <View style={styles.rowCenter}>
          <AppText variant="P4_Regular" style={{ color: '#aaa' }}>
            Bạn đã có tài khoản?{' '}
          </AppText>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <AppText style={styles.link}>Đăng nhập</AppText>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 16,
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logo: {
    width: 72,
    height: 72,
    marginBottom: 24,
    borderRadius: 12,
  },
  title: {
    textAlign: 'center',
    marginBottom: 32,
    color: '#fff',
  },
  label: {
    alignSelf: 'flex-start',
    color: '#fff',
    marginBottom: 8,
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#1c1c1c',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    color: '#fff',
  },
  inputError: {
    borderWidth: 1,
    borderColor: 'red',
  },
  error: {
    alignSelf: 'flex-start',
    color: 'red',
    marginBottom: 12,
  },
  primaryBtn: {
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginTop: 12,
  },
  addText: {
    textAlign: 'center',
    marginTop: 24,
    color: '#c0c0c0',
  },
  outlineBtn: {
    marginTop: 16,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
  btnText: {
    color: '#fff',
  },
  rowCenter: {
    flexDirection: 'row',
    marginTop: 20,
    alignItems: 'center',
  },
  link: {
    color: '#FFD23F',
    fontWeight: '600',
  },
  subText: {
    alignSelf: 'flex-start',
    color: '#aaa',
    marginBottom: 8,
  },
});