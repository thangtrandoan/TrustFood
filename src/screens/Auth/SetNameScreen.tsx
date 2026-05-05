import React, { useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { AppText } from '../../components/AppText';
import { useTheme } from '../../hooks/useTheme';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootNavigator';
import {
  completeRegistrationProfile,
  createUsernameCandidate,
  sendEmailVerificationAgain,
  signUpWithEmail,
} from '../../services/firebase';

export default function SetNameScreen() {
  const theme = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList, 'SetName'>>();

  const route = useRoute();
  const { email, password } = route.params as {
    email: string;
    password: string;
    otp: string;
  };

  const [name, setName] = useState('');
  const [userName, setUserName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!name.trim()) {
      setError('Vui lòng nhập tên');
      return;
    }

    const finalUserName = userName.trim() || createUsernameCandidate(name.trim(), email);
    if (!/^[a-zA-Z0-9_]{4,20}$/.test(finalUserName)) {
      setError('Username chi duoc dung chu, so, _, do dai 4-20 ky tu');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const credential = await signUpWithEmail(email, password);
      await completeRegistrationProfile({
        userName: finalUserName,
        fullName: name.trim(),
        email: credential.user?.email ?? email.trim(),
        authProvider: 'password',
        emailVerified: credential.user?.emailVerified ?? false,
      });
      await sendEmailVerificationAgain();

      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Không thể tạo tài khoản';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppText variant="H3" style={styles.title}>Tên của bạn</AppText>

      <TextInput
        placeholder="Tên của bạn"
        placeholderTextColor="#666"
        value={name}
        onChangeText={setName}
        style={[styles.input, error && styles.inputError]}
      />

      <TextInput
        placeholder="Username (4-20 ky tu, chu/so/_)"
        placeholderTextColor="#666"
        value={userName}
        onChangeText={setUserName}
        autoCapitalize="none"
        style={[styles.input, error && styles.inputError, styles.inputSpacing]}
      />

      {error ? <AppText style={styles.error}>{error}</AppText> : null}

      {!error ? (
        <AppText style={styles.hint}>
          Sau khi tạo tài khoản, hệ thống sẽ gửi email xác minh cho bạn.
        </AppText>
      ) : null}

      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.colors.primary, opacity: loading ? 0.7 : 1 }]}
        onPress={handleContinue}
        disabled={loading}
      >
        <AppText variant="P1_Medium">{loading ? 'Đang tạo tài khoản...' : 'Tiếp tục'}</AppText>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 20, justifyContent: 'center' },
  title: { color: '#fff', textAlign: 'center', marginBottom: 32 },
  input: {
    height: 50,
    backgroundColor: '#1c1c1c',
    borderRadius: 12,
    paddingHorizontal: 16,
    color: '#fff',
  },
  inputError: { borderWidth: 1, borderColor: 'red' },
  inputSpacing: { marginTop: 12 },
  error: { color: 'red', marginTop: 6 },
  hint: { color: '#aaa', marginTop: 10 },
  button: {
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
});