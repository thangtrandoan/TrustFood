import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { CONVERSATIONS_COLLECTION, MESSAGES_SUBCOLLECTION, USERS_COLLECTION } from './constants';
import { requireAuthUid } from './authGuard';
import type {
  AppUserProfile,
  ChatConversationDocument,
  ChatMessageDocument,
  ChatParticipantProfile,
} from './types';

export type ConversationListItem = {
  conversationId: string;
  partnerId: string;
  partnerName: string;
  partnerAvatar: string;
  lastMessage: string;
  lastMessageAt: ChatConversationDocument['last_message_at'] | null;
};

export type ConversationMessageItem = {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  createdAt: ChatMessageDocument['created_at'];
};

function buildConversationId(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join('_');
}

function mapProfileToChatParticipant(profile: AppUserProfile): ChatParticipantProfile {
  return {
    user_id: profile.user_id,
    user_name: profile.user_name,
    full_name: profile.full_name,
    avatar_url: profile.avatar_url,
  };
}

async function getRequiredUserProfile(uid: string): Promise<AppUserProfile> {
  const snapshot = await firestore().collection(USERS_COLLECTION).doc(uid).get();
  if (!snapshot.exists()) {
    throw new Error('USER_PROFILE_NOT_FOUND');
  }
  return snapshot.data() as AppUserProfile;
}

export async function ensureConversationWithUser(targetUserId: string): Promise<{
  conversationId: string;
  partner: ChatParticipantProfile;
}> {
  const uid = requireAuthUid();
  const normalizedTargetId = String(targetUserId ?? '').trim();

  if (!normalizedTargetId) {
    throw new Error('TARGET_USER_REQUIRED');
  }

  if (normalizedTargetId === uid) {
    throw new Error('SELF_CHAT_NOT_ALLOWED');
  }

  const [me, target] = await Promise.all([
    getRequiredUserProfile(uid),
    getRequiredUserProfile(normalizedTargetId),
  ]);

  const conversationId = buildConversationId(uid, normalizedTargetId);
  const conversationRef = firestore()
    .collection(CONVERSATIONS_COLLECTION)
    .doc(conversationId) as FirebaseFirestoreTypes.DocumentReference<ChatConversationDocument>;

  const now = firestore.FieldValue.serverTimestamp();

  await firestore().runTransaction(async (tx) => {
    const snapshot = await tx.get(conversationRef);
    if (snapshot.exists()) {
      const current = snapshot.data() as ChatConversationDocument;
      const currentProfiles = current.participant_profiles ?? {};
      const nextProfiles = {
        ...currentProfiles,
        [uid]: mapProfileToChatParticipant(me),
        [normalizedTargetId]: mapProfileToChatParticipant(target),
      };

      tx.set(
        conversationRef,
        {
          participant_ids: [uid, normalizedTargetId],
          participant_profiles: nextProfiles,
          updated_at: now,
        } as Partial<ChatConversationDocument>,
        { merge: true },
      );
      return;
    }

    const newDoc: ChatConversationDocument = {
      id: conversationId,
      participant_ids: [uid, normalizedTargetId],
      participant_profiles: {
        [uid]: mapProfileToChatParticipant(me),
        [normalizedTargetId]: mapProfileToChatParticipant(target),
      },
      last_message_text: '',
      last_message_sender_id: '',
      last_message_at: now,
      created_at: now,
      updated_at: now,
    };

    tx.set(conversationRef, newDoc);
  });

  return {
    conversationId,
    partner: mapProfileToChatParticipant(target),
  };
}

export function subscribeMyConversations(
  onData: (items: ConversationListItem[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const uid = requireAuthUid();

  const query = firestore()
    .collection(CONVERSATIONS_COLLECTION)
    .where('participant_ids', 'array-contains', uid)
    .limit(100);

  return query.onSnapshot(
    (snapshot) => {
      const items: ConversationListItem[] = [];

      snapshot.docs.forEach((doc) => {
        const data = doc.data() as ChatConversationDocument;
        const participantIds = Array.isArray(data.participant_ids) ? data.participant_ids : [];
        const partnerId = participantIds.find((id) => id !== uid) ?? '';
        if (!partnerId) {
          return;
        }

        const partner = data.participant_profiles?.[partnerId];
        items.push({
          conversationId: doc.id,
          partnerId,
          partnerName: partner?.user_name || 'Người dùng',
          partnerAvatar: partner?.avatar_url || 'https://i.pravatar.cc/150?img=47',
          lastMessage: data.last_message_text || 'Hãy bắt đầu cuộc trò chuyện',
          lastMessageAt: data.last_message_at ?? null,
        });
      });

      items.sort((a, b) => {
        const aMs = typeof (a.lastMessageAt as any)?.toMillis === 'function'
          ? (a.lastMessageAt as any).toMillis()
          : typeof (a.lastMessageAt as any)?.seconds === 'number'
            ? (a.lastMessageAt as any).seconds * 1000
            : 0;
        const bMs = typeof (b.lastMessageAt as any)?.toMillis === 'function'
          ? (b.lastMessageAt as any).toMillis()
          : typeof (b.lastMessageAt as any)?.seconds === 'number'
            ? (b.lastMessageAt as any).seconds * 1000
            : 0;

        return bMs - aMs;
      });

      onData(items);
    },
    (error) => {
      if (onError) {
        onError(error);
      }
    },
  );
}

export function subscribeConversationMessages(
  conversationId: string,
  onData: (items: ConversationMessageItem[]) => void,
  onError?: (error: Error) => void,
): () => void {
  requireAuthUid();

  const normalizedConversationId = String(conversationId ?? '').trim();
  if (!normalizedConversationId) {
    throw new Error('CONVERSATION_ID_REQUIRED');
  }

  const query = firestore()
    .collection(CONVERSATIONS_COLLECTION)
    .doc(normalizedConversationId)
    .collection(MESSAGES_SUBCOLLECTION)
    .orderBy('created_at', 'asc')
    .limit(300);

  return query.onSnapshot(
    (snapshot) => {
      const items = snapshot.docs.map((doc) => {
        const data = doc.data() as ChatMessageDocument;
        return {
          id: doc.id,
          senderId: String(data.sender_id ?? ''),
          receiverId: String(data.receiver_id ?? ''),
          text: String(data.text ?? ''),
          createdAt: data.created_at,
        } satisfies ConversationMessageItem;
      });

      onData(items);
    },
    (error) => {
      if (onError) {
        onError(error);
      }
    },
  );
}

export async function sendChatMessage(input: {
  conversationId: string;
  receiverId: string;
  text: string;
}): Promise<void> {
  const uid = requireAuthUid();
  const conversationId = String(input.conversationId ?? '').trim();
  const receiverId = String(input.receiverId ?? '').trim();
  const text = String(input.text ?? '').trim();

  if (!conversationId) {
    throw new Error('CONVERSATION_ID_REQUIRED');
  }

  if (!receiverId) {
    throw new Error('RECEIVER_ID_REQUIRED');
  }

  if (!text) {
    throw new Error('MESSAGE_TEXT_REQUIRED');
  }

  const conversationRef = firestore()
    .collection(CONVERSATIONS_COLLECTION)
    .doc(conversationId) as FirebaseFirestoreTypes.DocumentReference<ChatConversationDocument>;

  const senderProfileRef = firestore().collection(USERS_COLLECTION).doc(uid);
  const receiverProfileRef = firestore().collection(USERS_COLLECTION).doc(receiverId);

  const [senderSnapshot, receiverSnapshot] = await Promise.all([
    senderProfileRef.get(),
    receiverProfileRef.get(),
  ]);

  if (!senderSnapshot.exists() || !receiverSnapshot.exists()) {
    throw new Error('USER_PROFILE_NOT_FOUND');
  }

  const senderProfile = senderSnapshot.data() as AppUserProfile;
  const receiverProfile = receiverSnapshot.data() as AppUserProfile;

  const messageRef = conversationRef.collection(MESSAGES_SUBCOLLECTION).doc();
  const now = firestore.FieldValue.serverTimestamp();

  const messageData: ChatMessageDocument = {
    id: messageRef.id,
    conversation_id: conversationId,
    sender_id: uid,
    receiver_id: receiverId,
    text,
    created_at: now,
    updated_at: now,
  };

  const conversationPatch: Partial<ChatConversationDocument> = {
    participant_ids: [uid, receiverId],
    participant_profiles: {
      [uid]: mapProfileToChatParticipant(senderProfile),
      [receiverId]: mapProfileToChatParticipant(receiverProfile),
    },
    last_message_text: text,
    last_message_sender_id: uid,
    last_message_at: now,
    updated_at: now,
    created_at: now,
  };

  const batch = firestore().batch();
  batch.set(messageRef, messageData);
  batch.set(conversationRef, conversationPatch, { merge: true });
  await batch.commit();
}
