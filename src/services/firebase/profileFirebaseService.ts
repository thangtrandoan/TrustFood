import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import { STORAGE_BUCKET_CANDIDATES, USERS_COLLECTION } from './constants';
import { requireAuthUid } from './authGuard';
import type { AppUserProfile } from './types';

export type UpdateProfileInput = {
  fullName?: string;
  bio?: string;
  avatarLocalPath?: string;
};

function sanitizeStorageUri(uri: string): string {
  if (uri.startsWith('file://')) {
    return uri.slice(7);
  }
  return uri;
}

function getErrorCode(error: unknown): string {
  if (!error || typeof error !== 'object' || !('code' in error)) {
    return 'unknown';
  }
  return String((error as { code?: unknown }).code ?? 'unknown');
}

async function waitForAvatarObject(ref: any): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      await ref.getMetadata();
      return;
    } catch (error) {
      lastError = error;
      const code = getErrorCode(error);
      if (code !== 'storage/object-not-found' || attempt === 7) {
        throw error;
      }
      await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 250 * (attempt + 1));
      });
    }
  }

  throw lastError;
}

async function uploadAvatar(uid: string, localPath: string): Promise<{ avatarUrl: string; avatarPath: string }> {
  const avatarPath = `users/${uid}/avatars/${Date.now()}-${Math.floor(Math.random() * 1e6)}.jpg`;

  const refs: Array<{ ref: any; label: string }> = [
    { ref: storage().ref(avatarPath), label: 'default' },
  ];

  const seen = new Set<string>();
  for (let i = 0; i < STORAGE_BUCKET_CANDIDATES.length; i += 1) {
    const bucket = String(STORAGE_BUCKET_CANDIDATES[i] ?? '').trim();
    if (!bucket) {
      continue;
    }
    const normalizedBucket = bucket.startsWith('gs://') ? bucket : `gs://${bucket}`;
    const fullUrl = `${normalizedBucket}/${avatarPath}`;
    if (seen.has(fullUrl)) {
      continue;
    }
    seen.add(fullUrl);

    try {
      refs.push({ ref: storage().refFromURL(fullUrl), label: `bucket_${i + 1}` });
    } catch {
      // Continue with remaining candidates.
    }
  }

  let avatarUrl = '';
  let lastError: unknown;

  for (let i = 0; i < refs.length; i += 1) {
    try {
      await refs[i].ref.putFile(sanitizeStorageUri(localPath));
      avatarUrl = await refs[i].ref.getDownloadURL();
      break;
    } catch (error) {
      if (getErrorCode(error) === 'storage/object-not-found') {
        try {
          await waitForAvatarObject(refs[i].ref);
          avatarUrl = await refs[i].ref.getDownloadURL();
          break;
        } catch {
          // Continue fallback sequence below.
        }
      }

      lastError = error;
      if (i === refs.length - 1) {
        throw error;
      }
    }
  }

  if (!avatarUrl) {
    throw lastError ?? new Error('AVATAR_UPLOAD_FAILED');
  }

  return { avatarUrl, avatarPath };
}

async function deleteAvatarAcrossBuckets(avatarPath: string): Promise<void> {
  const safePath = String(avatarPath ?? '').trim();
  if (!safePath) {
    return;
  }

  const tasks: Promise<unknown>[] = [storage().ref(safePath).delete()];

  const seen = new Set<string>();
  for (let i = 0; i < STORAGE_BUCKET_CANDIDATES.length; i += 1) {
    const bucket = String(STORAGE_BUCKET_CANDIDATES[i] ?? '').trim();
    if (!bucket) {
      continue;
    }
    const normalizedBucket = bucket.startsWith('gs://') ? bucket : `gs://${bucket}`;
    const fullUrl = `${normalizedBucket}/${safePath}`;
    if (seen.has(fullUrl)) {
      continue;
    }
    seen.add(fullUrl);

    try {
      tasks.push(storage().refFromURL(fullUrl).delete());
    } catch {
      // Keep trying other candidate buckets.
    }
  }

  await Promise.allSettled(tasks);
}

export async function updateProfile(input: UpdateProfileInput): Promise<AppUserProfile> {
  const uid = requireAuthUid();
  const db = firestore();
  const userRef = db.collection(USERS_COLLECTION).doc(uid);
  const userSnapshot = await userRef.get();

  if (!userSnapshot.exists) {
    throw new Error('USER_PROFILE_NOT_FOUND');
  }

  const current = userSnapshot.data() as AppUserProfile;

  let avatarUrl = current.avatar_url;
  let avatarPath = current.avatar_path;

  if (input.avatarLocalPath) {
    const uploaded = await uploadAvatar(uid, input.avatarLocalPath);
    avatarUrl = uploaded.avatarUrl;
    avatarPath = uploaded.avatarPath;

    if (current.avatar_path) {
      await deleteAvatarAcrossBuckets(current.avatar_path);
    }
  }

  const nextProfile: Partial<AppUserProfile> = {
    avatar_url: avatarUrl,
    avatar_path: avatarPath,
    full_name: input.fullName?.trim() ?? current.full_name,
    full_name_lc: (input.fullName?.trim() ?? current.full_name).toLowerCase().replace(/\s+/g, ' '),
    bio: input.bio ?? current.bio,
    updated_at: firestore.FieldValue.serverTimestamp(),
  };

  await userRef.update(nextProfile);

  return {
    ...current,
    ...nextProfile,
  } as AppUserProfile;
}

export async function getUserProfileById(userId: string): Promise<AppUserProfile | null> {
  requireAuthUid();

  const snapshot = await firestore().collection(USERS_COLLECTION).doc(userId).get();
  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as AppUserProfile;
}
