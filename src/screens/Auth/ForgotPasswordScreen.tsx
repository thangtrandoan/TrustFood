import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { AppText } from '../../components/AppText';
import { useTheme } from '../../hooks/useTheme';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { sendForgotPasswordEmail } from '../../services/firebase';

export default function ForgotPasswordScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'ForgotPassword'>>();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const validateEmail = (value: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(value);
  };

  const handleSend = async () => {
    if (!validateEmail(email)) {
      setError('Email không hợp lệ');
      setSuccess('');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await sendForgotPasswordEmail(email.trim());
      setSuccess('Đã gửi email đặt lại mật khẩu. Vui lòng kiểm tra hộp thư.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể gửi email đặt lại mật khẩu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View>
        <AppText variant="H3" style={styles.title}>
          Quên mật khẩu
        </AppText>

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

        {error ? <AppText style={styles.error}>{error}</AppText> : null}
        {success ? <AppText style={styles.success}>{success}</AppText> : null}

        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: theme.colors.primary,
              opacity: loading ? 0.6 : 1,
            },
          ]}
          disabled={loading}
          onPress={handleSend}
        >
          <AppText variant="P1_Medium">{loading ? 'Đang gửi...' : 'Gửi email đặt lại mật khẩu'}</AppText>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.navigate('Login')}
          disabled={loading}
        >
          <AppText style={styles.backText}>Quay lại đăng nhập</AppText>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    color: '#fff',
    textAlign: 'center',
    marginBottom: 32,
  },
  label: {
    color: '#fff',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1c1c1c',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
    color: '#fff',
    marginBottom: 12,
  },
  inputError: {
    borderWidth: 1,
    borderColor: 'red',
  },
  error: {
    color: 'red',
    marginTop: 4,
  },
  success: {
    color: '#9de09a',
    marginTop: 4,
  },
  button: {
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  backBtn: {
    marginTop: 14,
    alignItems: 'center',
  },
  backText: {
    color: '#FFC726',
  },
});
