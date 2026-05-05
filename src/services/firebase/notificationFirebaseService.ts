import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { NOTIFICATIONS_COLLECTION } from './constants';
import { requireAuthUid } from './authGuard';
import type { NotificationDocument, NotificationType } from './types';

export type NotificationCursor = FirebaseFirestoreTypes.QueryDocumentSnapshot<NotificationDocument> | null;

export type NotificationResult = {
  items: NotificationDocument[];
  nextCursor: NotificationCursor;
};

type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  content: string;
  actorId?: string;
  postId?: string;
  data?: Record<string, string | number | boolean>;
  dedupeKey?: string;
  dedupeWindowMs?: number;
};

function normalizePageSize(pageSize?: number): number {
  const value = Number(pageSize ?? 20);
  if (!Number.isFinite(value)) {
    return 20;
  }

  return Math.max(1, Math.min(50, Math.floor(value)));
}

function toNotificationDoc(doc: FirebaseFirestoreTypes.QueryDocumentSnapshot<NotificationDocument>): NotificationDocument {
  const data = doc.data() as NotificationDocument;

  return {
    ...data,
    id: data.id || doc.id,
    user_id: String(data.user_id ?? ''),
    type: data.type,
    content: String(data.content ?? ''),
    is_read: Boolean(data.is_read),
    created_at: data.created_at,
  };
}

function assertNotificationInput(input: CreateNotificationInput): void {
  if (!input.userId.trim()) {
    throw new Error('USER_ID_REQUIRED');
  }

  if (!input.content.trim()) {
    throw new Error('NOTIFICATION_CONTENT_REQUIRED');
  }
}

export async function createNotification(input: CreateNotificationInput): Promise<string> {
  assertNotificationInput(input);

  const uid = requireAuthUid();
  if (input.actorId && input.actorId !== uid) {
    throw new Error('FORBIDDEN');
  }

  const dedupeWindowMs = input.dedupeWindowMs ?? 0;
  const dedupeKey = input.dedupeKey;

  if (dedupeKey && dedupeWindowMs > 0) {
    const recentSnapshot = await firestore()
      .collection(NOTIFICATIONS_COLLECTION)
      .where('user_id', '==', input.userId)
      .limit(30)
      .get();

    const now = Date.now();
    const duplicate = recentSnapshot.docs.find((doc) => {
      const item = doc.data() as NotificationDocument;
      if (item.type !== input.type) {
        return false;
      }
      const itemKey = String(item.data?.dedupe_key ?? '');
      const createdAt = item.created_at as FirebaseFirestoreTypes.Timestamp | undefined;
      const createdAtMs = createdAt?.toMillis?.() ?? 0;
      return itemKey === dedupeKey && now - createdAtMs <= dedupeWindowMs;
    });

    if (duplicate) {
      return duplicate.id;
    }
  }

  const ref = firestore().collection(NOTIFICATIONS_COLLECTION).doc();

  const data = input.dedupeKey
    ? { ...(input.data ?? {}), dedupe_key: input.dedupeKey }
    : input.data;

  const payload: NotificationDocument = {
    id: ref.id,
    user_id: input.userId.trim(),
    actor_id: input.actorId ?? uid,
    post_id: input.postId,
    type: input.type,
    content: input.content.trim(),
    is_read: false,
    created_at: firestore.FieldValue.serverTimestamp(),
    data,
  };

  await ref.set(payload);
  return ref.id;
}

export async function getMyNotifications(params?: {
  pageSize?: number;
  cursor?: NotificationCursor;
}): Promise<NotificationResult> {
  const uid = requireAuthUid();
  const pageSize = normalizePageSize(params?.pageSize);

  let cursor = params?.cursor ?? null;
  const collected: FirebaseFirestoreTypes.QueryDocumentSnapshot<NotificationDocument>[] = [];

  for (let round = 0; round < 6 && collected.length < pageSize; round += 1) {
    let query = firestore()
      .collection(NOTIFICATIONS_COLLECTION)
      .orderBy('created_at', 'desc')
      .limit(pageSize) as FirebaseFirestoreTypes.Query<NotificationDocument>;

    if (cursor) {
      query = query.startAfter(cursor);
    }

    const snapshot = await query.get();
    if (snapshot.empty) {
      cursor = null;
      break;
    }

    const myDocs = snapshot.docs.filter((doc) => {
      const item = doc.data() as NotificationDocument;
      return item.user_id === uid;
    });
    collected.push(...myDocs);
    cursor = snapshot.docs[snapshot.docs.length - 1];
  }

  const picked = collected.slice(0, pageSize);

  return {
    items: picked.map(toNotificationDoc),
    nextCursor: cursor,
  };
}

export async function getMyUnreadNotificationsCount(): Promise<number> {
  const uid = requireAuthUid();
  const snapshot = await firestore()
    .collection(NOTIFICATIONS_COLLECTION)
    .where('user_id', '==', uid)
    .get()
    ;

  return snapshot.docs.reduce((count, doc) => {
    const item = doc.data() as NotificationDocument;
    return count + (item.is_read ? 0 : 1);
  }, 0);
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const uid = requireAuthUid();
  const ref = firestore().collection(NOTIFICATIONS_COLLECTION).doc(notificationId);

  await firestore().runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists()) {
      throw new Error('NOTIFICATION_NOT_FOUND');
    }

    const data = snapshot.data() as NotificationDocument;
    if (data.user_id !== uid) {
      throw new Error('FORBIDDEN');
    }

    tx.update(ref, { is_read: true });
  });
}

export async function markAllMyNotificationsRead(): Promise<void> {
  const uid = requireAuthUid();
  const snapshot = await firestore()
    .collection(NOTIFICATIONS_COLLECTION)
    .where('user_id', '==', uid)
    .get();

  const unreadDocs = snapshot.docs.filter((doc) => {
    const item = doc.data() as NotificationDocument;
    return !item.is_read;
  });

  if (unreadDocs.length === 0) {
    return;
  }

  const batch = firestore().batch();
  unreadDocs.forEach((doc) => {
    batch.update(doc.ref, { is_read: true });
  });
  await batch.commit();
}

export async function pushWelcomeNotification(userId: string): Promise<string> {
  return createNotification({
    userId,
    type: 'welcome',
    content: 'Chào mừng bạn đến với TrustFood!',
  });
}

export async function pushFollowNotification(params: {
  userId: string;
  actorId: string;
  actorName: string;
}): Promise<string> {
  return createNotification({
    userId: params.userId,
    type: 'follow',
    actorId: params.actorId,
    content: `${params.actorName} đã theo dõi bạn`,
    dedupeKey: `follow:${params.actorId}:${params.userId}`,
    dedupeWindowMs: 60_000,
  });
}

export async function pushNewDeviceLoginNotification(userId: string): Promise<string> {
  return createNotification({
    userId,
    type: 'new_device_login',
    content: 'Tài khoản vừa đăng nhập trên một thiết bị mới',
    dedupeKey: `new_device_login:${userId}`,
    dedupeWindowMs: 60_000,
  });
}

export async function pushLikePostNotification(params: {
  userId: string;
  actorId: string;
  actorName: string;
  postId: string;
}): Promise<string> {
  return createNotification({
    userId: params.userId,
    type: 'like_post',
    actorId: params.actorId,
    postId: params.postId,
    content: `${params.actorName} đã thích bài viết của bạn`,
    dedupeKey: `like_post:${params.actorId}:${params.postId}`,
    dedupeWindowMs: 15_000,
  });
}

export async function pushCommentPostNotification(params: {
  userId: string;
  actorId: string;
  actorName: string;
  postId: string;
  commentPreview: string;
}): Promise<string> {
  return createNotification({
    userId: params.userId,
    type: 'comment_post',
    actorId: params.actorId,
    postId: params.postId,
    content: `${params.actorName} đã bình luận: "${params.commentPreview}"`,
  });
}
