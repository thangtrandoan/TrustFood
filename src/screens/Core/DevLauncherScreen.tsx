import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList, 'DevLauncher'>;

type LauncherItem = {
  label: string;
  onPress: (navigation: Nav) => void;
};

const ITEMS: LauncherItem[] = [
  { label: 'Splash', onPress: (navigation) => navigation.navigate('Splash') },
  { label: 'Auth Intro', onPress: (navigation) => navigation.navigate('AuthIntro') },
  { label: 'Login', onPress: (navigation) => navigation.navigate('Login') },
  { label: 'Register', onPress: (navigation) => navigation.navigate('Register') },
  { label: 'Forgot Password', onPress: (navigation) => navigation.navigate('ForgotPassword') },
  {
    label: 'Create Password (mock params)',
    onPress: (navigation) => navigation.navigate('CreatePassword', { email: 'ui@trustfood.dev', otp: '123456' }),
  },
  {
    label: 'Set Name (mock params)',
    onPress: (navigation) =>
      navigation.navigate('SetName', {
        email: 'ui@trustfood.dev',
        password: '12345678',
        otp: '123456',
      }),
  },
  { label: 'Camera', onPress: (navigation) => navigation.navigate('Camera') },
  { label: 'Discover', onPress: (navigation) => navigation.navigate('Discover') },
  {
    label: 'Send (mock image)',
    onPress: (navigation) =>
      navigation.navigate('Send', {
        imageUri: 'https://images.unsplash.com/photo-1525755662778-989d0524087e?w=1200',
      }),
  },
  { label: 'Profile', onPress: (navigation) => navigation.navigate('Profile') },
  { label: 'Profile Reviews', onPress: (navigation) => navigation.navigate('ProfileReviews') },
  { label: 'Personal Info', onPress: (navigation) => navigation.navigate('PersonalInfo') },
  { label: 'Change Password', onPress: (navigation) => navigation.navigate('ChangePassword') },
  { label: 'Terms Of Use', onPress: (navigation) => navigation.navigate('TermsOfUse') },
  { label: 'Help Center', onPress: (navigation) => navigation.navigate('HelpCenter') },
  { label: 'Share App', onPress: (navigation) => navigation.navigate('ShareApp') },
  { label: 'Friends', onPress: (navigation) => navigation.navigate('Friends') },
];

export default function DevLauncherScreen() {
  const navigation = useNavigation<Nav>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dev Launcher</Text>
      <Text style={styles.subtitle}>Chon man hinh de mo nhanh khi phat trien UI</Text>

      <ScrollView contentContainerStyle={styles.listContent}>
        {ITEMS.map((item) => (
          <TouchableOpacity
            key={item.label}
            style={styles.itemBtn}
            activeOpacity={0.8}
            onPress={() => item.onPress(navigation)}
          >
            <Text style={styles.itemLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b0b',
    paddingTop: 56,
    paddingHorizontal: 16,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    color: '#b7b7b7',
    marginTop: 6,
    marginBottom: 14,
    fontSize: 13,
  },
  listContent: {
    paddingBottom: 26,
  },
  itemBtn: {
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#272727',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 10,
  },
  itemLabel: {
    color: '#ffda36',
    fontSize: 15,
    fontWeight: '600',
  },
});
