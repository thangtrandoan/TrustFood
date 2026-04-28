# TrustFood Mobile App

React Native app review am thuc, dung Firebase (Authentication, Firestore, Storage) theo model Backend as a Service.

## 1) Cai dat moi truong

1. Cai Node.js >= 20.19.4 (du an hien tai dang o RN 0.83.1).
2. Cai Android Studio + Android SDK + Java 17.
3. Trong root du an, cai package:
   - `npm install`
4. iOS (neu can):
   - `cd ios && pod install && cd ..`

## 2) Firebase setup

1. Tao Firebase project tren console.
2. Bat cac dich vu:
   - Authentication (Email/Password + Google)
   - Firestore Database
   - Storage
3. Tao Android app trong Firebase:
   - Package name phai trung voi `applicationId` trong `android/app/build.gradle` (hien tai la `com.myapp`).
   - Tai file `google-services.json`, dat vao `android/app/google-services.json`.
4. Tao iOS app trong Firebase:
   - Tai file `GoogleService-Info.plist`, add vao Xcode target.
5. Deploy security rules:
   - `firebase deploy --only firestore:rules,storage`

## 3) Google Sign-In setup

1. Lay Web client ID tu Firebase Console (Authentication -> Sign-in method -> Google).
2. Goi ham configure luc app start:

```ts
import { configureGoogleSignIn } from './src/services/firebase';

configureGoogleSignIn('YOUR_WEB_CLIENT_ID.apps.googleusercontent.com');
```

## 4) Service da duoc code

Toan bo service Firebase moi nam trong:

- `src/services/firebase/index.ts`

### 4.1 Authentication & User

- `signUpWithEmail(email, password)`
- `sendEmailVerificationAgain()`
- `completeOnboardingAfterEmailVerification({ userName, fullName, avatarUrl?, bio? })`
- `signInWithEmail(email, password)`
- `signInWithGoogle()`
- `sendForgotPasswordEmail(email)`
- `updateCurrentUserPassword(newPassword)`
- `getCurrentUserProfile()`
- `updateProfile({ fullName?, bio?, avatarLocalPath? })`

Diem quan trong:

- Username duoc check trung lap qua collection `usernames` trong transaction.
- Tao document `users` dung schema:
  - `user_id, user_name, full_name, avatar_url, bio, follower_count, following_count, review_count, created_at`

### 4.2 Post

- `createPost(input)`
- `updatePost(postId, input)`
- `deletePost(postId)`

Diem quan trong:

- Upload anh len Storage, luu `image_urls` + `image_paths`.
- Tinh `location.geohash` bang `geofire-common`.
- Tang/giam `review_count` bang transaction/batch.
- Chi author moi duoc sua/xoa (service check + rule check).

### 4.3 Like/Dislike

- `toggleReaction(postId, 'like' | 'dislike')`
- `clearLike(postId)`
- `clearDislike(postId)`

Diem quan trong:

- 1 user chi co the o 1 trang thai like/dislike tai 1 thoi diem.
- Dung transaction de giu toan ven counter `like_count`, `dislike_count`.

### 4.4 Follow

- `followUser(targetUserId)`
- `unfollowUser(targetUserId)`

Diem quan trong:

- Ghi 2 phia trong sub-collections:
  - `users/{A}/followings/{B}`
  - `users/{B}/followers/{A}`
- Update `following_count`, `follower_count` bang transaction.

### 4.5 Feed & Search

- `getNewFeed({ pageSize, cursor })`
- `getUserProfileFeed(authorId, { pageSize, cursor })`
- `searchUsersByPrefix(queryText, limitCount)`

Diem quan trong:

- Feed sap xep theo `created_at desc` va ho tro cursor pagination.
- Moi bai post co kem trang thai `reaction` cua current user (liked/disliked).
- Search user theo prefix qua `user_name_lc`.

### 4.6 Map

- `getPostsNearby({ centerLat, centerLng, radiusKm, limitPerBound })`

Diem quan trong:

- Query theo geohash bounds (`geofire-common`).
- Loc lai bang khoang cach Haversine (`distanceBetween`) de dam bao dung ban kinh thuc te.

### 4.7 Notifications

- `createNotification(...)`
- `getMyNotifications({ pageSize, cursor })`
- `markNotificationRead(notificationId)`
- `markAllMyNotificationsRead()`
- `pushWelcomeNotification(userId)`
- `pushFollowNotification(...)`
- `pushLikePostNotification(...)`

Schema de xuat (collection `notifications`):

- `id`
- `user_id`
- `actor_id`
- `post_id`
- `type`
- `content`
- `is_read`
- `created_at`
- `data`

## 5) Security rules

Da them:

- `firestore.rules`
- `storage.rules`
- `firebase.json`

Tat ca rule mac dinh yeu cau `request.auth != null`.

## 6) Build APK

1. Dat `google-services.json` vao `android/app/`.
2. Generate keystore release:

```bash
keytool -genkeypair -v -storetype PKCS12 -keystore trustfood-release.keystore -alias trustfood -keyalg RSA -keysize 2048 -validity 10000
```

3. Khai bao signing release trong `android/gradle.properties`:

```properties
MYAPP_UPLOAD_STORE_FILE=trustfood-release.keystore
MYAPP_UPLOAD_KEY_ALIAS=trustfood
MYAPP_UPLOAD_STORE_PASSWORD=YOUR_STORE_PASSWORD
MYAPP_UPLOAD_KEY_PASSWORD=YOUR_KEY_PASSWORD
```

4. Sua `android/app/build.gradle` de dung release keystore (khong dung debug key khi release).
5. Build APK:

```bash
cd android
./gradlew assembleRelease
```

Tren Windows cmd:

```bat
cd android
gradlew.bat assembleRelease
```

APK dau ra:

- `android/app/build/outputs/apk/release/app-release.apk`

## 7) Luu y index Firestore

Vi co query ket hop (`where`, `orderBy`) va geohash, Firebase co the yeu cau tao index. Neu gap loi index, mo link Firebase cung cap de tao index tu dong.
