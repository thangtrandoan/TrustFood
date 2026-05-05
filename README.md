# TrustFood

TrustFood là một ứng dụng di động mạng xã hội dành cho những người đam mê ẩm thực. Ứng dụng cung cấp một nền tảng minh bạch và đáng tin cậy để người dùng chia sẻ, đánh giá và khám phá các địa điểm ăn uống thú vị. 

Với TrustFood, người dùng có thể:
- **Đánh giá và Review:** Đăng tải các bài viết chia sẻ trải nghiệm thực tế về nhà hàng, quán ăn kèm theo hình ảnh trực quan.
- **Khám phá địa điểm:** Tìm kiếm các địa điểm ăn uống ngon xung quanh vị trí hiện tại thông qua bản đồ (Map) tích hợp.
- **Kết nối cộng đồng:** Tương tác với người dùng khác qua việc Thích (Like), Bình luận và Theo dõi (Follow) các tài khoản chuyên đánh giá ẩm thực.
- **Quản lý cá nhân:** Theo dõi các bài viết yêu thích, quản lý trang cá nhân và nhận thông báo theo thời gian thực về các tương tác.

Ứng dụng được xây dựng đa nền tảng bằng **React Native** và sử dụng **Firebase** làm backend (bao gồm Authentication, Firestore Database và Cloud Storage).

## Hướng dẫn Build (Xây dựng ứng dụng)

### Yêu cầu môi trường
- Node.js (>= 20)
- Môi trường phát triển React Native (Android Studio, JDK 17 cho Android, Xcode cho iOS)
- Đã cài đặt các dependencies thông qua `npm install` hoặc `yarn install`.

### Build cho Android
**1. Khởi chạy Metro Bundler (nếu chạy debug):**
```bash
npm start
```

**2. Build bản Debug (để test trên máy ảo/máy thật):**
```bash
# Chạy trực tiếp qua react-native CLI
npm run android

# HOẶC build file APK (lưu tại android/app/build/outputs/apk/debug/app-debug.apk)
cd android
./gradlew assembleDebug
```

**3. Build bản Release (để xuất file cài đặt APK):**
Bản release sẽ được đóng gói toàn bộ JS bundle vào file APK, giúp ứng dụng chạy mượt mà không cần Metro server.
```bash
cd android
./gradlew assembleRelease
```
*File APK sẽ được tạo tại: `android/app/build/outputs/apk/release/app-release.apk`*

### Build cho iOS (Yêu cầu MacOS)
```bash
# Cài đặt Pods
cd ios && pod install && cd ..

# Chạy bản Debug trên Simulator
npm run ios

# Build bản Release:
# Mở thư mục ios/ bằng Xcode (mở file .xcworkspace) và thực hiện Build/Archive từ thanh Menu (Product > Archive).
```
