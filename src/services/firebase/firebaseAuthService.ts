import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import {
  DEFAULT_AVATAR_URL,
  USERNAMES_COLLECTION,
  USERS_COLLECTION,
} from './constants';
import { requireAuthUid, requireVerifiedEmail } from './authGuard';
import {
  pushNewDeviceLoginNotification,
  pushWelcomeNotification,
} from './notificationFirebaseService';
import type { AppUserProfile, UserNameDocument } from './types';

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
}): Promise<AppUserProfile> {
  const db = firestore();
  const userNameLc = normalizeUsername(params.userName);

  if (!USERNAME_REGEX.test(params.userName)) {
    throw new Error('USERNAME_INVALID');
  }

  return db.runTransaction(async (tx) => {
    const userRef = db.collection(USERS_COLLECTION).doc(params.uid);
    const usernameRef = db.collection(USERNAMES_COLLECTION).doc(userNameLc);

    const [userSnapshot, usernameSnapshot] = await Promise.all([
      tx.get(userRef),
      tx.get(usernameRef),
    ]);

    if (usernameSnapshot.exists()) {
      throw new Error('USERNAME_TAKEN');
    }

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
      avatar_url: params.avatarUrl ?? DEFAULT_AVATAR_URL,
      bio: params.bio ?? '',
      follower_count: 0,
      following_count: 0,
      review_count: 0,
      created_at: now,
      updated_at: now,
    };

    const usernameDoc: UserNameDocument = {
      user_id: params.uid,
      user_name: params.userName,
      user_name_lc: userNameLc,
      created_at: now,
    };

    tx.set(userRef, profile, { merge: true });
    tx.set(usernameRef, usernameDoc);

    return profile;
  });
}

export async function isUserNameAvailable(userName: string): Promise<boolean> {
  const normalized = normalizeUsername(userName);
  if (!USERNAME_REGEX.test(normalized)) {
    return false;
  }

  const snapshot = await firestore().collection(USERNAMES_COLLECTION).doc(normalized).get();
  return !snapshot.exists();
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
    .slice(0, 16);

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const suffix = attempt === 0 ? '' : String(Math.floor(Math.random() * 9000) + 1000);
    const candidate = `${emailBase}${suffix}`.slice(0, 20);

    try {
      await reserveUsernameAndCreateProfile({
        uid: user.uid,
        userName: candidate,
        fullName: user.displayName?.trim() || candidate,
        avatarUrl: user.photoURL ?? DEFAULT_AVATAR_URL,
      });
      await tryPushWelcome(user.uid);
      await tryPushDeviceLogin(user.uid);
      return;
    } catch (error) {
      if (error instanceof Error && (error.message === 'USERNAME_TAKEN' || error.message === 'USERNAME_INVALID')) {
        continue;
      }
      throw error;
    }
  }

  throw new Error('FAILED_TO_CREATE_PROFILE');
}

export function configureGoogleSignIn(webClientId: string): void {
  GoogleSignin.configure({
    webClientId,
    offlineAccess: false,
  });
}

export async function signUpWithEmail(email: string, password: string): Promise<FirebaseAuthTypes.UserCredential> {
  try {
    const credential = await auth().createUserWithEmailAndPassword(email.trim(), password);
    if (credential.user) {
      await credential.user.sendEmailVerification();
    }
    return credential;
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
  });

  await tryPushWelcome(user.uid);
  return profile;
}

export async function completeRegistrationProfile(input: {
  userName: string;
  fullName: string;
  avatarUrl?: string;
  bio?: string;
}): Promise<AppUserProfile> {
  const uid = requireAuthUid();
  const profile = await reserveUsernameAndCreateProfile({
    uid,
    userName: input.userName,
    fullName: input.fullName,
    avatarUrl: input.avatarUrl,
    bio: input.bio,
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
  const uid = requireAuthUid();
  const snapshot = await firestore().collection(USERS_COLLECTION).doc(uid).get();
  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as AppUserProfile;
}
