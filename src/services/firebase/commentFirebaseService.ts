import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { POSTS_COLLECTION, USERS_COLLECTION } from './constants';
import { requireAuthUid } from './authGuard';
import type { CommentDocument, PostDocument, AppUserProfile } from './types';
import { pushCommentPostNotification } from './notificationFirebaseService';

export type CommentCursor = FirebaseFirestoreTypes.QueryDocumentSnapshot<CommentDocument> | null;

export type CommentResult = {
  items: CommentDocument[];
  nextCursor: CommentCursor;
};

export async function getComments(postId: string, params?: {
  pageSize?: number;
  cursor?: CommentCursor;
}): Promise<CommentResult> {
  const pageSize = params?.pageSize ?? 20;
  let query = firestore()
    .collection(`${POSTS_COLLECTION}/${postId}/comments`)
    .orderBy('created_at', 'desc')
    .limit(pageSize) as FirebaseFirestoreTypes.Query<CommentDocument>;

  if (params?.cursor) {
    query = query.startAfter(params.cursor);
  }

  const snapshot = await query.get();
  
  if (snapshot.empty) {
    return { items: [], nextCursor: null };
  }

  const items = snapshot.docs.map(doc => {
    const data = doc.data() as CommentDocument;
    return {
      ...data,
      id: doc.id,
    };
  });

  return {
    items,
    nextCursor: snapshot.docs[snapshot.docs.length - 1],
  };
}

export async function addComment(postId: string, text: string): Promise<CommentDocument> {
  if (!text.trim()) {
    throw new Error('COMMENT_TEXT_REQUIRED');
  }

  const uid = requireAuthUid();
  const db = firestore();
  
  const userRef = db.collection(USERS_COLLECTION).doc(uid);
  const userSnapshot = await userRef.get();
  
  if (!userSnapshot.exists()) {
    throw new Error('USER_PROFILE_NOT_FOUND');
  }
  
  const user = userSnapshot.data() as AppUserProfile;
  const postRef = db.collection(POSTS_COLLECTION).doc(postId);
  const commentRef = postRef.collection('comments').doc();

  const now = firestore.FieldValue.serverTimestamp();
  
  const commentData: CommentDocument = {
    id: commentRef.id,
    post_id: postId,
    author_id: uid,
    author_username: user.user_name,
    author_avatar: user.avatar_url,
    text: text.trim(),
    created_at: now,
    updated_at: now,
  };

  await db.runTransaction(async (tx) => {
    const postSnapshot = await tx.get(postRef);
    if (!postSnapshot.exists()) {
      throw new Error('POST_NOT_FOUND');
    }

    tx.set(commentRef, commentData);
    tx.update(postRef, {
      comment_count: firestore.FieldValue.increment(1),
    });
  });

  // After transaction succeeds, push notification if not author
  try {
    const postSnapshot = await postRef.get();
    if (postSnapshot.exists()) {
      const post = postSnapshot.data() as PostDocument;
      if (post.author_id !== uid) {
        await pushCommentPostNotification({
          userId: post.author_id,
          actorId: uid,
          actorName: user.user_name,
          postId: postId,
          commentPreview: text.trim().substring(0, 50) + (text.length > 50 ? '...' : ''),
        });
      }
    }
  } catch (e) {
    console.error('Failed to send comment notification', e);
  }

  return commentData;
}

export async function updateComment(postId: string, commentId: string, text: string): Promise<void> {
  if (!text.trim()) {
    throw new Error('COMMENT_TEXT_REQUIRED');
  }

  const uid = requireAuthUid();
  const commentRef = firestore().collection(`${POSTS_COLLECTION}/${postId}/comments`).doc(commentId);
  
  const snapshot = await commentRef.get();
  if (!snapshot.exists) {
    throw new Error('COMMENT_NOT_FOUND');
  }

  const data = snapshot.data() as CommentDocument;
  if (data.author_id !== uid) {
    throw new Error('FORBIDDEN');
  }

  await commentRef.update({
    text: text.trim(),
    updated_at: firestore.FieldValue.serverTimestamp(),
  });
}

export async function deleteComment(postId: string, commentId: string): Promise<void> {
  const uid = requireAuthUid();
  const db = firestore();
  
  const postRef = db.collection(POSTS_COLLECTION).doc(postId);
  const commentRef = postRef.collection('comments').doc(commentId);

  await db.runTransaction(async (tx) => {
    const commentSnapshot = await tx.get(commentRef);
    if (!commentSnapshot.exists) {
      throw new Error('COMMENT_NOT_FOUND');
    }

    const data = commentSnapshot.data() as CommentDocument;
    
    // Check ownership
    if (data.author_id !== uid) {
      // Also allow post author to delete comments on their post
      const postSnapshot = await tx.get(postRef);
      if (postSnapshot.exists) {
        const postData = postSnapshot.data() as PostDocument;
        if (postData.author_id !== uid) {
          throw new Error('FORBIDDEN');
        }
      } else {
        throw new Error('FORBIDDEN');
      }
    }

    tx.delete(commentRef);
    tx.update(postRef, {
      comment_count: firestore.FieldValue.increment(-1),
    });
  });
}
