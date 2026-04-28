import auth from '@react-native-firebase/auth';

export function requireAuthUid(): string {
  const uid = auth().currentUser?.uid;
  if (!uid) {
    throw new Error('AUTH_REQUIRED');
  }

  return uid;
}

export function requireVerifiedEmail(): void {
  const user = auth().currentUser;
  if (!user) {
    throw new Error('AUTH_REQUIRED');
  }

  if (!user.emailVerified) {
    throw new Error('EMAIL_NOT_VERIFIED');
  }
}
