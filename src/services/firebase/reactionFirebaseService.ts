import firestore from '@react-native-firebase/firestore';
import { POSTS_COLLECTION, USERS_COLLECTION } from './constants';
import { requireAuthUid } from './authGuard';
import { pushLikePostNotification } from './notificationFirebaseService';

export type ReactionMode = 'like' | 'dislike';

export async function toggleReaction(postId: string, mode: ReactionMode): Promise<void> {
  const uid = requireAuthUid();
  const db = firestore();
  const postRef = db.collection(POSTS_COLLECTION).doc(postId);
  const likeRef = postRef.collection('likes').doc(uid);
  const dislikeRef = postRef.collection('dislikes').doc(uid);

  const actorProfile = await db.collection(USERS_COLLECTION).doc(uid).get();
  const actorName = actorProfile.exists()
    ? String(actorProfile.data()?.user_name ?? 'Nguoi dung')
    : 'Nguoi dung';

  let notifyTargetUserId: string | null = null;

  await db.runTransaction(async (tx) => {
    const [postSnapshot, likeSnapshot, dislikeSnapshot] = await Promise.all([
      tx.get(postRef),
      tx.get(likeRef),
      tx.get(dislikeRef),
    ]);

    if (!postSnapshot.exists()) {
      throw new Error('POST_NOT_FOUND');
    }

    const inc = firestore.FieldValue.increment;

    if (mode === 'like') {
      if (likeSnapshot.exists()) {
        tx.delete(likeRef);
        tx.update(postRef, { like_count: inc(-1) });
      } else {
        tx.set(likeRef, {
          user_id: uid,
          created_at: firestore.FieldValue.serverTimestamp(),
        });
        tx.update(postRef, { like_count: inc(1) });

        if (dislikeSnapshot.exists()) {
          tx.delete(dislikeRef);
          tx.update(postRef, { dislike_count: inc(-1) });
        }

        const authorId = String(postSnapshot.data()?.author_id ?? '');
        if (authorId && authorId !== uid) {
          notifyTargetUserId = authorId;
        }
      }

      return;
    }

    if (dislikeSnapshot.exists()) {
      tx.delete(dislikeRef);
      tx.update(postRef, { dislike_count: inc(-1) });
    } else {
      tx.set(dislikeRef, {
        user_id: uid,
        created_at: firestore.FieldValue.serverTimestamp(),
      });
      tx.update(postRef, { dislike_count: inc(1) });

      if (likeSnapshot.exists()) {
        tx.delete(likeRef);
        tx.update(postRef, { like_count: inc(-1) });
      }
    }
  });

  if (mode === 'like' && notifyTargetUserId) {
    await pushLikePostNotification({
      userId: notifyTargetUserId,
      actorId: uid,
      actorName,
      postId,
    }).catch(() => undefined);
  }
}

export async function clearLike(postId: string): Promise<void> {
  const uid = requireAuthUid();
  const db = firestore();
  const postRef = db.collection(POSTS_COLLECTION).doc(postId);
  const likeRef = postRef.collection('likes').doc(uid);

  await db.runTransaction(async (tx) => {
    const [postSnapshot, likeSnapshot] = await Promise.all([tx.get(postRef), tx.get(likeRef)]);
    if (!postSnapshot.exists() || !likeSnapshot.exists()) {
      return;
    }

    tx.delete(likeRef);
    tx.update(postRef, {
      like_count: firestore.FieldValue.increment(-1),
    });
  });
}

export async function clearDislike(postId: string): Promise<void> {
  const uid = requireAuthUid();
  const db = firestore();
  const postRef = db.collection(POSTS_COLLECTION).doc(postId);
  const dislikeRef = postRef.collection('dislikes').doc(uid);

  await db.runTransaction(async (tx) => {
    const [postSnapshot, dislikeSnapshot] = await Promise.all([tx.get(postRef), tx.get(dislikeRef)]);
    if (!postSnapshot.exists() || !dislikeSnapshot.exists()) {
      return;
    }

    tx.delete(dislikeRef);
    tx.update(postRef, {
      dislike_count: firestore.FieldValue.increment(-1),
    });
  });
}
