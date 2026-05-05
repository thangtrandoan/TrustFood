import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import type { PrivacyMode } from './constants';

export type FirestoreTimestamp = FirebaseFirestoreTypes.Timestamp | FirebaseFirestoreTypes.FieldValue;

export type AppUserProfile = {
  user_id: string;
  user_name: string;
  user_name_lc: string;
  full_name: string;
  full_name_lc: string;
  email?: string;
  auth_provider?: string;
  email_verified?: boolean;
  avatar_url: string;
  avatar_path?: string;
  bio: string;
  follower_count: number;
  following_count: number;
  review_count: number;
  created_at: FirestoreTimestamp;
  updated_at?: FirestoreTimestamp;
};

export type UserNameDocument = {
  user_id: string;
  user_name: string;
  user_name_lc: string;
  created_at: FirestoreTimestamp;
};

export type PostLocation = {
  lat: number;
  lng: number;
  address: string;
  geohash: string;
};

export type PostDocument = {
  post_id: string;
  author_id: string;
  author_username: string;
  author_avatar: string;
  restaurant_name: string;
  star_rating: number;
  content: string;
  image_urls: string[];
  image_paths: string[];
  price_min: number;
  price_max: number;
  opening_time: string;
  closing_time: string;
  privacy_mode: PrivacyMode;
  location: PostLocation;
  like_count: number;
  dislike_count: number;
  comment_count: number;
  created_at: FirestoreTimestamp;
  updated_at?: FirestoreTimestamp;
};

export type PostReactionStatus = {
  liked: boolean;
  disliked: boolean;
};

export type CommentDocument = {
  id: string;
  post_id: string;
  author_id: string;
  author_username: string;
  author_avatar: string;
  text: string;
  created_at: FirestoreTimestamp;
  updated_at?: FirestoreTimestamp;
};

export type NotificationType =
  | 'welcome'
  | 'new_device_login'
  | 'follow'
  | 'like_post'
  | 'comment_post'
  | 'system';

export type NotificationDocument = {
  id: string;
  user_id: string;
  actor_id?: string;
  post_id?: string;
  type: NotificationType;
  content: string;
  is_read: boolean;
  created_at: FirestoreTimestamp;
  data?: Record<string, string | number | boolean>;
};

export type ChatParticipantProfile = {
  user_id: string;
  user_name: string;
  full_name: string;
  avatar_url: string;
};

export type ChatConversationDocument = {
  id: string;
  participant_ids: string[];
  participant_profiles: Record<string, ChatParticipantProfile>;
  last_message_text: string;
  last_message_sender_id: string;
  last_message_at: FirestoreTimestamp;
  created_at: FirestoreTimestamp;
  updated_at?: FirestoreTimestamp;
};

export type ChatMessageDocument = {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  participant_ids: string[];
  text: string;
  created_at: FirestoreTimestamp;
  updated_at?: FirestoreTimestamp;
};
