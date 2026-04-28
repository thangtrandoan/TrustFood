import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, TextInput } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { changePasswordWithReauth } from '../../services/firebase';

export default function ChangePasswordScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('Profile');
  }, [navigation]);

  const isValid = useMemo(() => {
    return currentPassword.length > 0 && newPassword.length >= 8 && confirmPassword === newPassword;
  }, [confirmPassword, currentPassword, newPassword]);

  const handleSubmit = useCallback(async () => {
    if (!currentPassword) {
      setError('Vui lòng nhập mật khẩu hiện tại');
      setSuccess('');
      return;
    }

    if (newPassword.length < 8) {
      setError('Mật khẩu mới phải từ 8 ký tự');
      setSuccess('');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Xác nhận mật khẩu không khớp');
      setSuccess('');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await changePasswordWithReauth(currentPassword, newPassword);
      setSuccess('Đổi mật khẩu thành công');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể đổi mật khẩu');
    } finally {
      setLoading(false);
    }
  }, [confirmPassword, currentPassword, newPassword]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back-outline" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Đổi mật khẩu</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.text}>Nhập thông tin để sẵn sàng kết nối API đổi mật khẩu.</Text>

        <TextInput
          secureTextEntry
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="Mật khẩu hiện tại"
          placeholderTextColor="#9f9f9f"
          style={styles.input}
        />
        <TextInput
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="Mật khẩu mới"
          placeholderTextColor="#9f9f9f"
          style={styles.input}
        />
        <TextInput
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Xác nhận mật khẩu mới"
          placeholderTextColor="#9f9f9f"
          style={styles.input}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {success ? <Text style={styles.success}>{success}</Text> : null}

        <TouchableOpacity
          style={[styles.submitBtn, { opacity: isValid && !loading ? 1 : 0.65 }]}
          activeOpacity={0.8}
          onPress={handleSubmit}
          disabled={!isValid || loading}
        >
          <Text style={styles.submitText}>{loading ? 'Đang cập nhật...' : 'Đổi mật khẩu'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0b09',
    paddingHorizontal: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 46,
    marginBottom: 20,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  title: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#1b1714',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 14,
  },
  text: {
    color: '#f0f0f0',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#2b2520',
    borderRadius: 12,
    color: '#fff',
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 10,
  },
  submitBtn: {
    marginTop: 8,
    backgroundColor: '#ffd31a',
    borderRadius: 12,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitText: {
    color: '#101010',
    fontWeight: '700',
  },
  error: {
    color: '#ff7d7d',
    marginBottom: 8,
  },
  success: {
    color: '#9de09a',
    marginBottom: 8,
  },
});
