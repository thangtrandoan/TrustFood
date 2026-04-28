export const USERS_COLLECTION = 'users';
export const USERNAMES_COLLECTION = 'usernames';
export const POSTS_COLLECTION = 'posts';
export const NOTIFICATIONS_COLLECTION = 'notifications';
export const CONVERSATIONS_COLLECTION = 'conversations';
export const MESSAGES_SUBCOLLECTION = 'messages';
export const STORAGE_BUCKET_CANDIDATES = [
  'gs://trustfood-ef219.appspot.com',
  'gs://trustfood-ef219.firebasestorage.app',
  'gs://trustfood-app',
  'gs://trustfood-app.appspot.com',
] as const;

export const DEFAULT_AVATAR_URL =
  'https://firebasestorage.googleapis.com/v0/b/trustfood-app/o/default%2Favatar.png?alt=media';

export const PRIVACY_MODES = {
  public: 'public',
  private: 'private',
} as const;

export type PrivacyMode = (typeof PRIVACY_MODES)[keyof typeof PRIVACY_MODES];
