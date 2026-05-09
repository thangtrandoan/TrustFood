import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { AppText } from '../../components/AppText';
import { useTheme } from '../../hooks/useTheme';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { sendForgotPasswordEmail } from '../../services/firebase';

const { width } = Dimensions.get('window');
const baseWidth = 375;
const scale = (size: number) => (width / baseWidth) * size;

export default function ForgotPasswordScreen() {
  const theme = useTheme();
  const navigation =
    useNavigation<
      NativeStackNavigationProp<RootStackParamList, 'ForgotPassword'>
    >();

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
      setError(
        e instanceof Error
          ? e.message
          : 'Không thể gửi email đặt lại mật khẩu'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
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
            <AppText variant="P1_Medium">
              {loading ? 'Đang gửi...' : 'Gửi email đặt lại mật khẩu'}
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.navigate('Login')}
            disabled={loading}
          >
            <AppText style={styles.backText}>
              Quay lại đăng nhập
            </AppText>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingHorizontal: scale(20),
  },

  content: {
    flex: 1,
    justifyContent: 'center',
  },

  title: {
    color: '#fff',
    textAlign: 'center',
    marginBottom: scale(28),
  },

  label: {
    color: '#fff',
    marginBottom: scale(6),
    marginLeft: scale(4),
  },

  input: {
    backgroundColor: '#1c1c1c',
    borderRadius: scale(12),
    paddingHorizontal: scale(14),
    height: scale(50),
    color: '#fff',
    marginBottom: scale(10),
    fontSize: scale(14),
  },

  inputError: {
    borderWidth: 1,
    borderColor: 'red',
  },

  error: {
    color: 'red',
    marginTop: scale(4),
    marginBottom: scale(6),
    fontSize: scale(12),
  },

  success: {
    color: '#9de09a',
    marginTop: scale(4),
    marginBottom: scale(6),
    fontSize: scale(12),
  },

  button: {
    height: scale(54),
    borderRadius: scale(28),
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: scale(20),
  },

  backBtn: {
    marginTop: scale(14),
    alignItems: 'center',
  },

  backText: {
    color: '#FFC726',
    fontSize: scale(13),
  },
});