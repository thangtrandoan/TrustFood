import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { USERS_COLLECTION } from './constants';
import { requireAuthUid } from './authGuard';
import { pushFollowNotification } from './notificationFirebaseService';
import type { AppUserProfile } from './types';

type FollowRefData = {
  user_id: string;
  user_name: string;
  avatar_url: string;
  created_at: FirebaseFirestoreTypes.FieldValue;
};

export type FollowListItem = {
  user_id: string;
  user_name: string;
  avatar_url: string;
};

export async function followUser(targetUserId: string): Promise<void> {
  const currentUid = requireAuthUid();
  if (currentUid === targetUserId) {
    throw new Error('CANNOT_FOLLOW_SELF');
  }

  const db = firestore();
  const currentUserRef = db.collection(USERS_COLLECTION).doc(currentUid);
  const targetUserRef = db.collection(USERS_COLLECTION).doc(targetUserId);

  const followingRef = currentUserRef.collection('followings').doc(targetUserId);
  const followerRef = targetUserRef.collection('followers').doc(currentUid);

  let created = false;
  let actorName = 'Nguoi dung';

  await db.runTransaction(async (tx) => {
    const [currentSnapshot, targetSnapshot, followingSnapshot, followerSnapshot] = await Promise.all([
      tx.get(currentUserRef),
      tx.get(targetUserRef),
      tx.get(followingRef),
      tx.get(followerRef),
    ]);

    if (!currentSnapshot.exists() || !targetSnapshot.exists()) {
      throw new Error('USER_NOT_FOUND');
    }

    const currentUser = currentSnapshot.data() as AppUserProfile;
    const targetUser = targetSnapshot.data() as AppUserProfile;
    actorName = currentUser.user_name;

    const hasFollowing = followingSnapshot.exists();
    const hasFollower = followerSnapshot.exists();
    if (hasFollowing && hasFollower) {
      return;
    }

    const now = firestore.FieldValue.serverTimestamp();

    const followingData: FollowRefData = {
      user_id: targetUserId,
      user_name: targetUser.user_name,
      avatar_url: targetUser.avatar_url,
      created_at: now,
    };

    const followerData: FollowRefData = {
      user_id: currentUid,
      user_name: currentUser.user_name,
      avatar_url: currentUser.avatar_url,
      created_at: now,
    };

    if (!hasFollowing) {
      tx.set(followingRef, followingData);
    }
    if (!hasFollower) {
      tx.set(followerRef, followerData);
    }

    const currentFollowingCount = Number(currentUser.following_count) || 0;
    const targetFollowerCount = Number(targetUser.follower_count) || 0;

    tx.update(currentUserRef, {
      following_count: currentFollowingCount + (hasFollowing ? 0 : 1),
      updated_at: now,
    });

    tx.update(targetUserRef, {
      follower_count: targetFollowerCount + (hasFollower ? 0 : 1),
      updated_at: now,
    });

    created = !hasFollowing || !hasFollower;
  });

  if (created) {
    await pushFollowNotification({
      userId: targetUserId,
      actorId: currentUid,
      actorName,
    }).catch(() => undefined);
  }
}

export async function unfollowUser(targetUserId: string): Promise<void> {
  const currentUid = requireAuthUid();
  const db = firestore();
  const currentUserRef = db.collection(USERS_COLLECTION).doc(currentUid);
  const targetUserRef = db.collection(USERS_COLLECTION).doc(targetUserId);

  const followingRef = currentUserRef.collection('followings').doc(targetUserId);
  const followerRef = targetUserRef.collection('followers').doc(currentUid);

  await db.runTransaction(async (tx) => {
    const [currentSnapshot, targetSnapshot, followingSnapshot, followerSnapshot] = await Promise.all([
      tx.get(currentUserRef),
      tx.get(targetUserRef),
      tx.get(followingRef),
      tx.get(followerRef),
    ]);

    if (!currentSnapshot.exists() || !targetSnapshot.exists()) {
      throw new Error('USER_NOT_FOUND');
    }

    const currentUser = currentSnapshot.data() as AppUserProfile;
    const targetUser = targetSnapshot.data() as AppUserProfile;

    if (!followingSnapshot.exists() && !followerSnapshot.exists()) {
      return;
    }

    let followingRemoved = false;
    let followerRemoved = false;

    if (followingSnapshot.exists()) {
      tx.delete(followingRef);
      followingRemoved = true;
    }

    if (followerSnapshot.exists()) {
      tx.delete(followerRef);
      followerRemoved = true;
    }

    if (followingRemoved) {
      const currentFollowingCount = Number(currentUser.following_count) || 0;
      tx.update(currentUserRef, {
        following_count: Math.max(0, currentFollowingCount - 1),
        updated_at: firestore.FieldValue.serverTimestamp(),
      });
    }

    if (followerRemoved) {
      const targetFollowerCount = Number(targetUser.follower_count) || 0;
      tx.update(targetUserRef, {
        follower_count: Math.max(0, targetFollowerCount - 1),
        updated_at: firestore.FieldValue.serverTimestamp(),
      });
    }
  });
}

export async function getMyFollowings(limitCount = 100): Promise<FollowListItem[]> {
  const uid = requireAuthUid();
  const snapshot = await firestore()
    .collection(USERS_COLLECTION)
    .doc(uid)
    .collection('followings')
    .orderBy('created_at', 'desc')
    .limit(limitCount)
    .get();

  return snapshot.docs.map((doc) => doc.data() as FollowListItem);
}

export async function getMyFollowers(limitCount = 100): Promise<FollowListItem[]> {
  const uid = requireAuthUid();
  const snapshot = await firestore()
    .collection(USERS_COLLECTION)
    .doc(uid)
    .collection('followers')
    .orderBy('created_at', 'desc')
    .limit(limitCount)
    .get();

  return snapshot.docs.map((doc) => doc.data() as FollowListItem);
}
