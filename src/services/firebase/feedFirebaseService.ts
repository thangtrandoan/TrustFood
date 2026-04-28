import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { POSTS_COLLECTION, PRIVACY_MODES, USERS_COLLECTION } from './constants';
import { requireAuthUid } from './authGuard';
import type { AppUserProfile, PostDocument, PostReactionStatus } from './types';

export type FeedCursor = FirebaseFirestoreTypes.QueryDocumentSnapshot<PostDocument> | null;

export type FeedItem = PostDocument & {
  reaction: PostReactionStatus;
};

export type FeedResult = {
  items: FeedItem[];
  nextCursor: FeedCursor;
};

function normalizePageSize(pageSize?: number): number {
  const value = Number(pageSize ?? 20);
  if (!Number.isFinite(value)) {
    return 20;
  }

  return Math.max(1, Math.min(50, Math.floor(value)));
}

function isPostPublic(post: Partial<PostDocument>): boolean {
  const candidate = post as Partial<PostDocument> & { privacyMode?: string };
  const value = String(candidate.privacy_mode ?? candidate.privacyMode ?? '').toLowerCase();
  if (!value) {
    return true;
  }
  return value !== PRIVACY_MODES.private;
}

async function getReactionStatus(postId: string, uid: string): Promise<PostReactionStatus> {
  const postRef = firestore().collection(POSTS_COLLECTION).doc(postId);
  const [likeSnapshot, dislikeSnapshot] = await Promise.all([
    postRef.collection('likes').doc(uid).get(),
    postRef.collection('dislikes').doc(uid).get(),
  ]);

  return {
    liked: likeSnapshot.exists(),
    disliked: dislikeSnapshot.exists(),
  };
}

async function mapFeedItems(docs: FirebaseFirestoreTypes.QueryDocumentSnapshot<PostDocument>[], uid: string): Promise<FeedItem[]> {
  return Promise.all(
    docs.map(async (doc) => {
      const reaction = await getReactionStatus(doc.id, uid);
      return {
        ...(doc.data() as PostDocument),
        reaction,
      };
    }),
  );
}

export async function getNewFeed(params?: {
  pageSize?: number;
  cursor?: FeedCursor;
}): Promise<FeedResult> {
  const uid = requireAuthUid();
  const pageSize = normalizePageSize(params?.pageSize);

  let cursor = params?.cursor ?? null;
  const collected: FirebaseFirestoreTypes.QueryDocumentSnapshot<PostDocument>[] = [];

  for (let round = 0; round < 6 && collected.length < pageSize; round += 1) {
    let query = firestore()
      .collection(POSTS_COLLECTION)
      .orderBy('created_at', 'desc')
      .limit(pageSize) as FirebaseFirestoreTypes.Query<PostDocument>;

    if (cursor) {
      query = query.startAfter(cursor);
    }

    const snapshot = await query.get();
    if (snapshot.empty) {
      cursor = null;
      break;
    }

    const publicDocs = snapshot.docs.filter((doc) => {
      const post = doc.data() as PostDocument;
      return isPostPublic(post);
    });
    collected.push(...publicDocs);

    cursor = snapshot.docs[snapshot.docs.length - 1];
  }

  const picked = collected.slice(0, pageSize);
  const items = await mapFeedItems(picked, uid);

  return {
    items,
    nextCursor: cursor,
  };
}

export async function getUserProfileFeed(authorId: string, params?: {
  pageSize?: number;
  cursor?: FeedCursor;
}): Promise<FeedResult> {
  const uid = requireAuthUid();
  const pageSize = normalizePageSize(params?.pageSize);

  const normalizedAuthorId = authorId.trim();
  if (!normalizedAuthorId) {
    throw new Error('AUTHOR_ID_REQUIRED');
  }

  let cursor = params?.cursor ?? null;
  const collected: FirebaseFirestoreTypes.QueryDocumentSnapshot<PostDocument>[] = [];

  for (let round = 0; round < 6 && collected.length < pageSize; round += 1) {
    let query = firestore()
      .collection(POSTS_COLLECTION)
      .orderBy('created_at', 'desc')
      .limit(pageSize) as FirebaseFirestoreTypes.Query<PostDocument>;

    if (cursor) {
      query = query.startAfter(cursor);
    }

    const snapshot = await query.get();
    if (snapshot.empty) {
      cursor = null;
      break;
    }

    const filtered = snapshot.docs.filter((doc) => {
      const post = doc.data() as PostDocument;
      if (post.author_id !== normalizedAuthorId) {
        return false;
      }

      if (normalizedAuthorId === uid) {
        return true;
      }

      return isPostPublic(post);
    });

    collected.push(...filtered);
    cursor = snapshot.docs[snapshot.docs.length - 1];
  }

  const picked = collected.slice(0, pageSize);
  const items = await mapFeedItems(picked, uid);

  return {
    items,
    nextCursor: cursor,
  };
}

export async function searchUsersByPrefix(queryText: string, limitCount = 20): Promise<AppUserProfile[]> {
  requireAuthUid();

  const keyword = queryText.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!keyword) {
    return [];
  }

  const safeLimit = Math.max(1, Math.min(50, Math.floor(Number(limitCount) || 20)));

  const [userNameSnapshot, fullNameSnapshot] = await Promise.all([
    firestore()
    .collection(USERS_COLLECTION)
    .orderBy('user_name_lc')
    .startAt(keyword)
    .endAt(`${keyword}\uf8ff`)
    .limit(safeLimit)
    .get(),
    firestore()
    .collection(USERS_COLLECTION)
    .orderBy('full_name_lc')
    .startAt(keyword)
    .endAt(`${keyword}\uf8ff`)
    .limit(safeLimit)
    .get(),
  ]);

  const seen = new Set<string>();
  const users = [...userNameSnapshot.docs, ...fullNameSnapshot.docs]
    .map((doc) => doc.data() as AppUserProfile)
    .filter((user) => {
      if (seen.has(user.user_id)) {
        return false;
      }
      seen.add(user.user_id);
      return true;
    })
    .sort((a, b) => {
      const aStartsWith = a.user_name_lc.startsWith(keyword) ? 0 : 1;
      const bStartsWith = b.user_name_lc.startsWith(keyword) ? 0 : 1;
      if (aStartsWith !== bStartsWith) {
        return aStartsWith - bStartsWith;
      }
      return a.user_name_lc.localeCompare(b.user_name_lc);
    })
    .slice(0, safeLimit);

  return users;
}
