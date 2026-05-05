import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import {
  DEFAULT_AVATAR_URL,
  USERS_COLLECTION,
} from './constants';
import { requireAuthUid, requireVerifiedEmail } from './authGuard';
import {
  pushNewDeviceLoginNotification,
  pushWelcomeNotification,
} from './notificationFirebaseService';
import type { AppUserProfile } from './types';

const USERNAME_REGEX = /^[a-zA-Z0-9_]{4,20}$/;

function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

function toSafeUsernameSeed(raw: string): string {
  const normalized = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (!normalized) {
    return 'trustfood_user';
  }

  if (normalized.length < 4) {
    return `${normalized}user`.slice(0, 20);
  }

  return normalized.slice(0, 20);
}

export function createUsernameCandidate(fullName: string, email?: string): string {
  const base = toSafeUsernameSeed(fullName || (email ?? ''));
  const suffix = String(Math.floor(Math.random() * 9000) + 1000);
  return `${base.slice(0, Math.max(4, 20 - suffix.length))}${suffix}`;
}

function normalizeFullName(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ');
}

function mapAuthError(error: unknown): string {
  const fallback = 'Có lỗi xảy ra, vui lòng thử lại';

  if (!error || typeof error !== 'object' || !('code' in error)) {
    return fallback;
  }

  const code = String(error.code);

  if (code === 'auth/invalid-email') return 'Email không hợp lệ';
  if (code === 'auth/user-disabled') return 'Tài khoản đã bị vô hiệu hóa';
  if (code === 'auth/user-not-found') return 'Không tìm thấy tài khoản';
  if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') return 'Sai email hoặc mật khẩu';
  if (code === 'auth/email-already-in-use') return 'Email đã được sử dụng';
  if (code === 'auth/weak-password') return 'Mật khẩu quá yếu';
  if (code === 'auth/network-request-failed') return 'Lỗi kết nối mạng';

  return fallback;
}

async function reserveUsernameAndCreateProfile(params: {
  uid: string;
  userName: string;
  fullName: string;
  avatarUrl?: string;
  bio?: string;
  email?: string;
  authProvider?: string;
  emailVerified?: boolean;
}): Promise<AppUserProfile> {
  const db = firestore();
  const userNameLc = normalizeUsername(params.userName);

  if (!USERNAME_REGEX.test(params.userName)) {
    throw new Error('USERNAME_INVALID');
  }

  return db.runTransaction(async (tx) => {
    const userRef = db.collection(USERS_COLLECTION).doc(params.uid);
    const userSnapshot = await tx.get(userRef);

    if (userSnapshot.exists() && userSnapshot.data()?.user_name) {
      throw new Error('PROFILE_ALREADY_EXISTS');
    }

    const now = firestore.FieldValue.serverTimestamp();

    const profile: AppUserProfile = {
      user_id: params.uid,
      user_name: params.userName,
      user_name_lc: userNameLc,
      full_name: params.fullName.trim(),
      full_name_lc: normalizeFullName(params.fullName),
      email: params.email,
      auth_provider: params.authProvider,
      email_verified: params.emailVerified,
      avatar_url: params.avatarUrl ?? DEFAULT_AVATAR_URL,
      bio: params.bio ?? '',
      follower_count: 0,
      following_count: 0,
      review_count: 0,
      created_at: now,
      updated_at: now,
    };

    tx.set(userRef, profile, { merge: true });

    return profile;
  });
}

async function tryPushWelcome(userId: string): Promise<void> {
  await pushWelcomeNotification(userId).catch(() => undefined);
}

async function tryPushDeviceLogin(userId: string): Promise<void> {
  await pushNewDeviceLoginNotification(userId).catch(() => undefined);
}

async function createProfileForGoogleUserIfMissing(user: FirebaseAuthTypes.User): Promise<void> {
  const db = firestore();
  const userRef = db.collection(USERS_COLLECTION).doc(user.uid);
  const existing = await userRef.get();
  if (existing.exists()) {
    await tryPushDeviceLogin(user.uid);
    return;
  }

  const emailBase = (user.email ?? `user_${user.uid.slice(0, 6)}`)
    .split('@')[0]
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .slice(0, 20);
  const candidate = emailBase || `user_${user.uid.slice(0, 6)}`;

  await reserveUsernameAndCreateProfile({
    uid: user.uid,
    userName: candidate,
    fullName: user.displayName?.trim() || candidate,
    avatarUrl: user.photoURL ?? DEFAULT_AVATAR_URL,
    email: user.email ?? undefined,
    authProvider: 'google',
    emailVerified: user.emailVerified,
  });
  await tryPushWelcome(user.uid);
  await tryPushDeviceLogin(user.uid);
}

export function configureGoogleSignIn(webClientId: string): void {
  GoogleSignin.configure({
    webClientId,
    offlineAccess: false,
  });
}

export async function signUpWithEmail(email: string, password: string): Promise<FirebaseAuthTypes.UserCredential> {
  const normalizedEmail = email.trim();

  try {
    const methods = await auth().fetchSignInMethodsForEmail(normalizedEmail);
    if (methods.length > 0) {
      if (methods.includes('google.com')) {
        throw new Error('Email đã được đăng ký bằng Google. Vui lòng đăng nhập bằng Google.');
      }
      throw new Error('Email đã được sử dụng');
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Email')) {
      throw error;
    }

    if (error && typeof error === 'object' && 'code' in error) {
      throw new Error(mapAuthError(error));
    }
  }

  try {
    return await auth().createUserWithEmailAndPassword(normalizedEmail, password);
  } catch (error) {
    throw new Error(mapAuthError(error));
  }
}

export async function completeOnboardingAfterEmailVerification(input: {
  userName: string;
  fullName: string;
  avatarUrl?: string;
  bio?: string;
}): Promise<AppUserProfile> {
  const user = auth().currentUser;
  if (!user) {
    throw new Error('AUTH_REQUIRED');
  }

  await user.reload();
  requireVerifiedEmail();

  const profile = await reserveUsernameAndCreateProfile({
    uid: user.uid,
    userName: input.userName,
    fullName: input.fullName,
    avatarUrl: input.avatarUrl,
    bio: input.bio,
    email: user.email ?? undefined,
    authProvider: 'password',
    emailVerified: user.emailVerified,
  });

  await tryPushWelcome(user.uid);
  return profile;
}

export async function completeRegistrationProfile(input: {
  userName: string;
  fullName: string;
  avatarUrl?: string;
  bio?: string;
  email?: string;
  authProvider?: string;
  emailVerified?: boolean;
}): Promise<AppUserProfile> {
  const uid = requireAuthUid();
  const profile = await reserveUsernameAndCreateProfile({
    uid,
    userName: input.userName,
    fullName: input.fullName,
    avatarUrl: input.avatarUrl,
    bio: input.bio,
    email: input.email,
    authProvider: input.authProvider,
    emailVerified: input.emailVerified,
  });

  await tryPushWelcome(uid);
  return profile;
}

export async function signInWithEmail(email: string, password: string): Promise<FirebaseAuthTypes.UserCredential> {
  try {
    const credential = await auth().signInWithEmailAndPassword(email.trim(), password);
    await tryPushDeviceLogin(credential.user.uid);
    return credential;
  } catch (error) {
    throw new Error(mapAuthError(error));
  }
}

export async function signInWithGoogle(): Promise<FirebaseAuthTypes.UserCredential> {
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const googleUser = await GoogleSignin.signIn();
    if (!googleUser.data?.idToken) {
      throw new Error('Không lấy được Google ID token');
    }

    const credential = auth.GoogleAuthProvider.credential(googleUser.data.idToken);
    const result = await auth().signInWithCredential(credential);

    if (result.user) {
      await createProfileForGoogleUserIfMissing(result.user);
    }

    return result;
  } catch (error) {
    throw new Error(mapAuthError(error));
  }
}

export async function signOutFirebase(): Promise<void> {
  await Promise.allSettled([GoogleSignin.signOut(), auth().signOut()]);
}

export async function sendForgotPasswordEmail(email: string): Promise<void> {
  try {
    await auth().sendPasswordResetEmail(email.trim());
  } catch (error) {
    throw new Error(mapAuthError(error));
  }
}

export async function sendEmailVerificationAgain(): Promise<void> {
  const user = auth().currentUser;
  if (!user) {
    throw new Error('AUTH_REQUIRED');
  }

  await user.sendEmailVerification();
}

export async function updateCurrentUserPassword(newPassword: string): Promise<void> {
  const user = auth().currentUser;
  if (!user) {
    throw new Error('AUTH_REQUIRED');
  }

  await user.updatePassword(newPassword);
}

export async function changePasswordWithReauth(currentPassword: string, newPassword: string): Promise<void> {
  const user = auth().currentUser;
  if (!user || !user.email) {
    throw new Error('AUTH_REQUIRED');
  }

  const credential = auth.EmailAuthProvider.credential(user.email, currentPassword);
  await user.reauthenticateWithCredential(credential);
  await user.updatePassword(newPassword);
}

export async function getCurrentUserProfile(): Promise<AppUserProfile | null> {
  const user = auth().currentUser;
  if (!user) {
    throw new Error('AUTH_REQUIRED');
  }

  try {
    const snapshot = await firestore().collection(USERS_COLLECTION).doc(user.uid).get();
    if (snapshot.exists()) {
      return snapshot.data() as AppUserProfile;
    }
  } catch {
    // Fall through to an Auth-based profile when Firestore is not used.
  }

  const emailBase = (user.email ?? `user_${user.uid.slice(0, 6)}`)
    .split('@')[0]
    .replace(/[^a-zA-Z0-9_]/g, '_');
  const fullName = user.displayName?.trim() || emailBase || 'Nguoi dung';
  const userName = toSafeUsernameSeed(fullName || emailBase || user.uid);
  const now = firestore.Timestamp.now();

  return {
    user_id: user.uid,
    user_name: userName,
    user_name_lc: userName.toLowerCase(),
    full_name: fullName,
    full_name_lc: normalizeFullName(fullName),
    email: user.email ?? undefined,
    auth_provider: user.providerData?.[0]?.providerId ?? 'password',
    email_verified: user.emailVerified,
    avatar_url: user.photoURL ?? DEFAULT_AVATAR_URL,
    bio: '',
    follower_count: 0,
    following_count: 0,
    review_count: 0,
    created_at: now,
    updated_at: now,
  };
}
