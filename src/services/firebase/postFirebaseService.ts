import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import storage, { FirebaseStorageTypes } from '@react-native-firebase/storage';
import { geohashForLocation } from 'geofire-common';
import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import {
  POSTS_COLLECTION,
  USERS_COLLECTION,
  type PrivacyMode,
} from './constants';
import { requireAuthUid } from './authGuard';
import type { AppUserProfile, PostDocument } from './types';

const POST_STORAGE_BUCKET = 'gs://trustfood-ef219.appspot.com';

export type CreatePostInput = {
  restaurantName: string;
  starRating: number;
  content: string;
  imageLocalPaths: string[];
  priceMin: number;
  priceMax: number;
  openingTime: string;
  closingTime: string;
  privacyMode: PrivacyMode;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
};

export type UpdatePostInput = Partial<
  Omit<CreatePostInput, 'imageLocalPaths' | 'location'> & {
    imageLocalPaths: string[];
    location: {
      lat: number;
      lng: number;
      address: string;
    };
  }
>;

export type UploadProgress = {
  uploadedCount: number;
  totalCount: number;
  percent: number;
  currentFileIndex: number;
  currentFileBytesTransferred: number;
  currentFileTotalBytes: number;
};

export type CreatePostOptions = {
  onUploadProgress?: (progress: UploadProgress) => void;
  preUploadedImages?: Array<{ imageUrl: string; imagePath: string }>;
};

function assertValidCoordinates(lat: number, lng: number): void {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new Error('INVALID_LOCATION');
  }
}

function assertCreatePostInput(input: CreatePostInput): void {
  if (!Array.isArray(input.imageLocalPaths) || input.imageLocalPaths.length === 0) {
    throw new Error('POST_IMAGE_REQUIRED');
  }

  if (!input.restaurantName.trim()) {
    throw new Error('RESTAURANT_NAME_REQUIRED');
  }

  if (!Number.isFinite(input.starRating) || input.starRating < 1 || input.starRating > 5) {
    throw new Error('INVALID_STAR_RATING');
  }

  if (!Number.isFinite(input.priceMin) || !Number.isFinite(input.priceMax) || input.priceMin < 0 || input.priceMax < 0) {
    throw new Error('INVALID_PRICE_RANGE');
  }

  if (input.priceMax < input.priceMin) {
    throw new Error('INVALID_PRICE_RANGE');
  }

  if (!input.location.address.trim()) {
    throw new Error('ADDRESS_REQUIRED');
  }

  assertValidCoordinates(input.location.lat, input.location.lng);
}

function assertUpdatePostInput(input: UpdatePostInput): void {
  if (input.starRating !== undefined && (!Number.isFinite(input.starRating) || input.starRating < 1 || input.starRating > 5)) {
    throw new Error('INVALID_STAR_RATING');
  }

  if (
    input.priceMin !== undefined &&
    (!Number.isFinite(input.priceMin) || input.priceMin < 0)
  ) {
    throw new Error('INVALID_PRICE_RANGE');
  }

  if (
    input.priceMax !== undefined &&
    (!Number.isFinite(input.priceMax) || input.priceMax < 0)
  ) {
    throw new Error('INVALID_PRICE_RANGE');
  }

  if (
    input.priceMin !== undefined &&
    input.priceMax !== undefined &&
    input.priceMax < input.priceMin
  ) {
    throw new Error('INVALID_PRICE_RANGE');
  }

  if (input.location) {
    if (!input.location.address.trim()) {
      throw new Error('ADDRESS_REQUIRED');
    }
    assertValidCoordinates(input.location.lat, input.location.lng);
  }

  if (input.imageLocalPaths && input.imageLocalPaths.length === 0) {
    throw new Error('POST_IMAGE_REQUIRED');
  }
}

function sanitizeStorageUri(uri: string): string {
  const trimmed = String(uri ?? '').trim();

  if (Platform.OS === 'android' && !trimmed.startsWith('file://') && !trimmed.startsWith('content://')) {
    return `file://${trimmed}`;
  }

  if (Platform.OS === 'ios' && trimmed.startsWith('file://')) {
    return trimmed.slice(7);
  }

  return trimmed;
}

function isRemoteHttpUrl(uri: string): boolean {
  return /^https?:\/\//i.test(uri);
}

function getUriKind(uri: string): 'remote' | 'content' | 'file' | 'path' | 'unknown' {
  if (!uri) return 'unknown';
  if (isRemoteHttpUrl(uri)) return 'remote';
  if (uri.startsWith('content://')) return 'content';
  if (uri.startsWith('file://')) return 'file';
  if (uri.startsWith('/')) return 'path';
  return 'unknown';
}

function getUploadFileExtension(uri: string): string {
  const cleaned = String(uri ?? '').split('?')[0];
  const matched = cleaned.match(/\.([a-zA-Z0-9]+)$/);
  const ext = matched?.[1]?.toLowerCase();
  if (!ext) {
    return 'jpg';
  }
  return ext;
}

function createPostImagePath(uid: string, postId: string, index: number, localUri: string): string {
  const ext = getUploadFileExtension(localUri);
  const unique = `${Date.now()}-${Math.floor(Math.random() * 1e9)}-${index}`;
  return `posts/${uid}/${postId}/${unique}.${ext}`;
}

function getPostStorageRef(fullPath: string): FirebaseStorageTypes.Reference {
  const normalizedPath = String(fullPath ?? '').replace(/^\/+/, '');
  return storage().refFromURL(`${POST_STORAGE_BUCKET}/${normalizedPath}`);
}

export async function uploadSingleImage(params: {
  uid: string;
  postId: string;
  index?: number;
  localUri: string;
  onProgress?: (snapshot: FirebaseStorageTypes.TaskSnapshot) => void;
}): Promise<{ imageUrl: string; imagePath: string }> {
  const { uid, postId, localUri, onProgress } = params;
  const index = Number.isFinite(params.index) ? Number(params.index) : 0;
  const imagePath = createPostImagePath(uid, postId, index, localUri);
  let uri = String(localUri ?? '').trim();
  if (Platform.OS === 'ios' && uri.startsWith('file://')) {
    uri = uri.replace('file://', '');
  }

  const fsPath = uri.startsWith('file://') ? uri.replace('file://', '') : uri;

  const ref = getPostStorageRef(imagePath);
  let unsubscribe: (() => void) | undefined;

  try {
    console.log('[post-upload] base64_read_start', {
      sourceUri: localUri,
      sanitizedUri: uri,
      fsPath,
      uriKind: getUriKind(localUri),
      storagePath: imagePath,
    });

    const exists = await RNFS.exists(fsPath);
    if (!exists) {
      throw new Error('File ảnh không tồn tại trong cache!');
    }

    const base64String = await RNFS.readFile(fsPath, 'base64');

    console.log('[post-upload] base64_read_success', {
      storagePath: imagePath,
      base64Length: base64String.length,
    });

    const task = ref.putString(base64String, 'base64', { contentType: 'image/jpeg' });

    if (onProgress) {
      unsubscribe = task.on('state_changed', (snapshot: FirebaseStorageTypes.TaskSnapshot) => {
        onProgress(snapshot);
      });
    }

    await task;

    console.log('[post-upload] base64_put_success', {
      storagePath: imagePath,
    });

    const imageUrl = await ref.getDownloadURL();

    console.log('[post-upload] putFile_success', {
      storagePath: imagePath,
    });

    return {
      imageUrl,
      imagePath,
    };
  } catch (error) {
    console.error('[post-upload] base64_put_failed', {
      sourceUri: localUri,
      sanitizedUri: uri,
      fsPath,
      uriKind: getUriKind(localUri),
      storagePath: imagePath,
      code: getErrorCode(error),
      message: getErrorMessage(error),
    });
    throw error;
  } finally {
    if (unsubscribe) {
      unsubscribe();
    }
  }
}

function isStorageObjectNotFound(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('code' in error)) {
    return false;
  }

  return String(error.code) === 'storage/object-not-found';
}

function getErrorCode(error: unknown): string {
  if (!error || typeof error !== 'object' || !('code' in error)) {
    return 'unknown';
  }

  return String((error as { code?: unknown }).code ?? 'unknown');
}

function getErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object' || !('message' in error)) {
    return 'unknown_error';
  }

  return String((error as { message?: unknown }).message ?? 'unknown_error');
}

function uploadLog(stage: string, payload?: Record<string, unknown>): void {
  if (payload) {
    console.log(`[post-upload] ${stage}`, payload);
    return;
  }

  console.log(`[post-upload] ${stage}`);
}

async function deleteStoragePathAcrossBuckets(fullPath: string): Promise<void> {
  const safePath = String(fullPath ?? '').trim();
  if (!safePath) {
    return;
  }

  await getPostStorageRef(safePath).delete();
}

async function uploadPostImages(
  uid: string,
  postId: string,
  imageLocalPaths: string[],
  onUploadProgress?: (progress: UploadProgress) => void,
) {
  const totalCount = imageLocalPaths.length;
  let uploadedCount = 0;
  const uploaded: Array<{ imageUrl: string; imagePath: string }> = [];

  const emitProgress = (params: {
    currentFileIndex: number;
    currentFileBytesTransferred: number;
    currentFileTotalBytes: number;
    currentFileRatio: number;
  }) => {
    if (!onUploadProgress) {
      return;
    }

    const ratio = Number.isFinite(params.currentFileRatio) ? params.currentFileRatio : 0;
    const normalizedRatio = Math.max(0, Math.min(1, ratio));
    const percent = totalCount > 0
      ? Math.max(0, Math.min(100, Math.round(((uploadedCount + normalizedRatio) / totalCount) * 100)))
      : 100;

    onUploadProgress({
      uploadedCount,
      totalCount,
      percent,
      currentFileIndex: params.currentFileIndex,
      currentFileBytesTransferred: params.currentFileBytesTransferred,
      currentFileTotalBytes: params.currentFileTotalBytes,
    });
  };

  emitProgress({
    currentFileIndex: 0,
    currentFileBytesTransferred: 0,
    currentFileTotalBytes: 0,
    currentFileRatio: 0,
  });

  for (let index = 0; index < imageLocalPaths.length; index += 1) {
    const path = imageLocalPaths[index];
    const uriKind = getUriKind(path);

    if (isRemoteHttpUrl(path)) {
      uploaded.push({
        imageUrl: path,
        imagePath: '',
      });
      uploadedCount += 1;
      emitProgress({
        currentFileIndex: index + 1,
        currentFileBytesTransferred: 1,
        currentFileTotalBytes: 1,
        currentFileRatio: 0,
      });
      continue;
    }

    const imagePath = createPostImagePath(uid, postId, index, path);

    try {
      uploadLog('upload_image_prepare', {
        index: index + 1,
        totalCount,
        sourceUri: path,
        uriKind,
        storagePath: imagePath,
      });

      const uploadedItem = await uploadSingleImage({
        uid,
        postId,
        index,
        localUri: path,
        onProgress: (snapshot) => {
          const currentFileTotalBytes = Number(snapshot.totalBytes || 0);
          const currentFileBytesTransferred = Number(snapshot.bytesTransferred || 0);
          const ratio = currentFileTotalBytes > 0
            ? currentFileBytesTransferred / currentFileTotalBytes
            : 0;

          emitProgress({
            currentFileIndex: index + 1,
            currentFileBytesTransferred,
            currentFileTotalBytes,
            currentFileRatio: ratio,
          });
        },
      });

      uploadLog('upload_image_success', {
        index: index + 1,
        totalCount,
        storagePath: uploadedItem.imagePath,
      });
      uploaded.push({
        imageUrl: uploadedItem.imageUrl,
        imagePath: uploadedItem.imagePath,
      });
      uploadedCount += 1;
      emitProgress({
        currentFileIndex: index + 1,
        currentFileBytesTransferred: 1,
        currentFileTotalBytes: 1,
        currentFileRatio: 0,
      });
    } catch (error) {
      const code = getErrorCode(error);
      const stage = isStorageObjectNotFound(error) ? 'download_url' : 'upload';
      uploadLog('upload_image_failed', {
        index: index + 1,
        totalCount,
        sourceUri: path,
        uriKind,
        storagePath: imagePath,
        code,
        stage,
        message: getErrorMessage(error),
      });
      throw new Error(`UPLOAD_IMAGE_FAILED:${code}:${stage}:${uriKind}`);
    }
  }

  return {
    image_urls: uploaded.map((item) => item.imageUrl),
    image_paths: uploaded.map((item) => item.imagePath),
  };
}

async function ensureAuthorOwnership(postId: string, uid: string): Promise<FirebaseFirestoreTypes.DocumentReference<PostDocument>> {
  const postRef = firestore().collection(POSTS_COLLECTION).doc(postId) as FirebaseFirestoreTypes.DocumentReference<PostDocument>;
  const snapshot = await postRef.get();

  if (!snapshot.exists()) {
    throw new Error('POST_NOT_FOUND');
  }

  const post = snapshot.data() as PostDocument;
  if (post.author_id !== uid) {
    throw new Error('FORBIDDEN');
  }

  return postRef;
}

export async function createPost(input: CreatePostInput, options?: CreatePostOptions): Promise<PostDocument> {
  assertCreatePostInput(input);

  const uid = requireAuthUid();
  const db = firestore();
  const userRef = db.collection(USERS_COLLECTION).doc(uid);
  const userSnapshot = await userRef.get();

  if (!userSnapshot.exists()) {
    throw new Error('USER_PROFILE_NOT_FOUND');
  }

  const user = userSnapshot.data() as AppUserProfile;

  const postRef = db.collection(POSTS_COLLECTION).doc();
  let image_paths: string[] = [];
  let image_urls: string[] = [];

  try {
    const preUploadedImages = options?.preUploadedImages ?? [];
    if (preUploadedImages.length > 0) {
      image_urls = preUploadedImages.map((item) => item.imageUrl);
      image_paths = preUploadedImages.map((item) => item.imagePath);
    } else {
      const totalCount = input.imageLocalPaths.length;
      let uploadedCount = 0;

      const emitProgress = (params: {
        currentFileIndex: number;
        currentFileBytesTransferred: number;
        currentFileTotalBytes: number;
        currentFileRatio: number;
      }) => {
        if (!options?.onUploadProgress) {
          return;
        }

        const ratio = Number.isFinite(params.currentFileRatio) ? params.currentFileRatio : 0;
        const normalizedRatio = Math.max(0, Math.min(1, ratio));
        const percent = totalCount > 0
          ? Math.max(0, Math.min(100, Math.round(((uploadedCount + normalizedRatio) / totalCount) * 100)))
          : 100;

        options.onUploadProgress({
          uploadedCount,
          totalCount,
          percent,
          currentFileIndex: params.currentFileIndex,
          currentFileBytesTransferred: params.currentFileBytesTransferred,
          currentFileTotalBytes: params.currentFileTotalBytes,
        });
      };

      emitProgress({
        currentFileIndex: 0,
        currentFileBytesTransferred: 0,
        currentFileTotalBytes: 0,
        currentFileRatio: 0,
      });

      let fileIndex = 0;
      for (const localPath of input.imageLocalPaths) {
        const uriKind = getUriKind(localPath);

        if (isRemoteHttpUrl(localPath)) {
          image_urls.push(localPath);
          image_paths.push('');
          uploadedCount += 1;
          fileIndex += 1;
          emitProgress({
            currentFileIndex: fileIndex,
            currentFileBytesTransferred: 1,
            currentFileTotalBytes: 1,
            currentFileRatio: 0,
          });
          continue;
        }

        try {
          const uploaded = await uploadSingleImage({
            uid,
            postId: postRef.id,
            index: fileIndex,
            localUri: localPath,
            onProgress: (snapshot) => {
              const currentFileTotalBytes = Number(snapshot.totalBytes || 0);
              const currentFileBytesTransferred = Number(snapshot.bytesTransferred || 0);
              const ratio = currentFileTotalBytes > 0
                ? currentFileBytesTransferred / currentFileTotalBytes
                : 0;

              emitProgress({
                currentFileIndex: fileIndex + 1,
                currentFileBytesTransferred,
                currentFileTotalBytes,
                currentFileRatio: ratio,
              });
            },
          });

          image_urls.push(uploaded.imageUrl);
          image_paths.push(uploaded.imagePath);
          uploadedCount += 1;
          fileIndex += 1;
          emitProgress({
            currentFileIndex: fileIndex,
            currentFileBytesTransferred: 1,
            currentFileTotalBytes: 1,
            currentFileRatio: 0,
          });
        } catch (error) {
          const code = getErrorCode(error);
          const stage = isStorageObjectNotFound(error) ? 'download_url' : 'upload';
          uploadLog('create_post_upload_failed', {
            sourceUri: localPath,
            uriKind,
            code,
            stage,
            message: getErrorMessage(error),
          });
          throw new Error(`UPLOAD_IMAGE_FAILED:${code}:${stage}:${uriKind}`);
        }
      }
    }

    const geohash = geohashForLocation([input.location.lat, input.location.lng]);
    const now = firestore.FieldValue.serverTimestamp();

    const postData: PostDocument = {
      post_id: postRef.id,
      author_id: uid,
      author_username: user.user_name,
      author_avatar: user.avatar_url,
      restaurant_name: input.restaurantName.trim(),
      star_rating: input.starRating,
      content: input.content.trim(),
      image_urls,
      image_paths,
      price_min: input.priceMin,
      price_max: input.priceMax,
      opening_time: input.openingTime,
      closing_time: input.closingTime,
      privacy_mode: input.privacyMode,
      location: {
        lat: input.location.lat,
        lng: input.location.lng,
        address: input.location.address,
        geohash,
      },
      like_count: 0,
      dislike_count: 0,
      created_at: now,
      updated_at: now,
    };

    await db.runTransaction(async (tx) => {
      const transactionUserSnapshot = await tx.get(userRef);
      if (!transactionUserSnapshot.exists()) {
        throw new Error('USER_PROFILE_NOT_FOUND');
      }

      tx.set(postRef, postData);
      tx.set(
        userRef,
        {
          review_count: firestore.FieldValue.increment(1),
          updated_at: now,
        },
        { merge: true },
      );
    });

    return postData;
  } catch (error) {
    const cloudImagePaths = image_paths.filter((path) => path.trim().length > 0);
    if (cloudImagePaths.length > 0) {
      await Promise.allSettled(cloudImagePaths.map((path) => deleteStoragePathAcrossBuckets(path)));
    }
    throw error;
  }
}

export async function updatePost(postId: string, input: UpdatePostInput): Promise<void> {
  assertUpdatePostInput(input);

  const uid = requireAuthUid();
  const postRef = await ensureAuthorOwnership(postId, uid);
  const snapshot = await postRef.get();
  const currentPost = snapshot.data() as PostDocument;

  let nextImageUrls = currentPost.image_urls;
  let nextImagePaths = currentPost.image_paths;
  let newlyUploadedImagePaths: string[] = [];

  if (input.imageLocalPaths && input.imageLocalPaths.length > 0) {
    const uploaded = await uploadPostImages(uid, postId, input.imageLocalPaths);
    nextImageUrls = uploaded.image_urls;
    nextImagePaths = uploaded.image_paths;
    newlyUploadedImagePaths = uploaded.image_paths.filter((path) => path.trim().length > 0);

    await Promise.allSettled(currentPost.image_paths.map((path) => deleteStoragePathAcrossBuckets(path)));
  }

  const updates: Partial<PostDocument> = {
    updated_at: firestore.FieldValue.serverTimestamp(),
  };

  if (input.restaurantName !== undefined) updates.restaurant_name = input.restaurantName.trim();
  if (input.starRating !== undefined) updates.star_rating = input.starRating;
  if (input.content !== undefined) updates.content = input.content.trim();
  if (input.priceMin !== undefined) updates.price_min = input.priceMin;
  if (input.priceMax !== undefined) updates.price_max = input.priceMax;
  if (input.openingTime !== undefined) updates.opening_time = input.openingTime;
  if (input.closingTime !== undefined) updates.closing_time = input.closingTime;
  if (input.privacyMode !== undefined) updates.privacy_mode = input.privacyMode;
  if (input.imageLocalPaths !== undefined) {
    updates.image_urls = nextImageUrls;
    updates.image_paths = nextImagePaths;
  }

  if (input.location) {
    updates.location = {
      lat: input.location.lat,
      lng: input.location.lng,
      address: input.location.address,
      geohash: geohashForLocation([input.location.lat, input.location.lng]),
    };
  }

  try {
    await postRef.update(updates);
  } catch (error) {
    if (newlyUploadedImagePaths.length > 0) {
      await Promise.allSettled(newlyUploadedImagePaths.map((path) => deleteStoragePathAcrossBuckets(path)));
    }
    throw error;
  }
}

export async function deletePost(postId: string): Promise<void> {
  const uid = requireAuthUid();
  const db = firestore();
  const postRef = await ensureAuthorOwnership(postId, uid);
  const postSnapshot = await postRef.get();
  const post = postSnapshot.data() as PostDocument;

  const [likesSnapshot, dislikesSnapshot] = await Promise.all([
    postRef.collection('likes').get(),
    postRef.collection('dislikes').get(),
  ]);

  const batch = db.batch();
  likesSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
  dislikesSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
  batch.delete(postRef);
  batch.set(
    db.collection(USERS_COLLECTION).doc(uid),
    {
      review_count: firestore.FieldValue.increment(-1),
      updated_at: firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await batch.commit();

  await Promise.allSettled(
    (post.image_paths ?? [])
      .filter((path) => path.trim().length > 0)
      .map((path) => deleteStoragePathAcrossBuckets(path)),
  );
}
