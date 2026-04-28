import React, { useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { AppText } from '../../components/AppText';
import { useTheme } from '../../hooks/useTheme';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootNavigator';

export default function CreatePasswordScreen() {
  const theme = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList, 'CreatePassword'>>();

  const route = useRoute();
  const { email, otp } = route.params as { email: string; otp: string };

  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleContinue = () => {
    if (password.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự');
      return;
    }

    navigation.navigate('SetName', { email, password, otp });
  };

  return (
    <View style={styles.container}>
      <AppText variant="H3" style={styles.title}>Chọn mật khẩu</AppText>

      <AppText style={styles.label}>Mật khẩu</AppText>
      <TextInput
        placeholder="Nhập mật khẩu"
        placeholderTextColor="#666"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={[styles.input, error && styles.inputError]}
      />

      <AppText style={styles.hint}>
        Mật khẩu của bạn tối thiểu 8 ký tự
      </AppText>

      {error ? <AppText style={styles.error}>{error}</AppText> : null}

      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.colors.primary }]}
        onPress={handleContinue}
      >
        <AppText variant="P1_Medium">Tiếp tục</AppText>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 20, justifyContent: 'center' },
  title: { color: '#fff', textAlign: 'center', marginBottom: 32 },
  label: { color: '#fff', marginBottom: 8 },
  input: {
    height: 50,
    backgroundColor: '#1c1c1c',
    borderRadius: 12,
    paddingHorizontal: 16,
    color: '#fff',
  },
  inputError: { borderWidth: 1, borderColor: 'red' },
  hint: { color: '#aaa', marginTop: 6 },
  error: { color: 'red', marginTop: 6 },
  button: {
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
});