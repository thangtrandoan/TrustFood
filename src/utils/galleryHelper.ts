import { launchImageLibrary } from "react-native-image-picker";
import { PERMISSIONS, RESULTS, request, check } from "react-native-permissions";
import { Platform, Alert } from "react-native";

function getPhotoLibraryPermission() {
  if (Platform.OS === "android") {
    const androidVersion = Number(Platform.Version);
    // Android 13+ uses scoped media permissions instead of READ_EXTERNAL_STORAGE.
    if (androidVersion >= 33) {
      return PERMISSIONS.ANDROID.READ_MEDIA_IMAGES;
    }
    return PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE;
  }

  return PERMISSIONS.IOS.PHOTO_LIBRARY;
}

export const openPhoneGallery = async (onImageSelected: (uri: string) => void) => {
  try {
    if (Platform.OS === "android") {
      // Android does not require permissions to use launchImageLibrary 
      // (Storage Access Framework / Photo Picker handles it)
      await launchGallery(onImageSelected);
      return;
    }

    const permission = getPhotoLibraryPermission();
    const permissionResult = await check(permission);

    if (permissionResult === RESULTS.GRANTED) {
      await launchGallery(onImageSelected);
    } else {
      const requestResult = await request(permission);
      if (requestResult === RESULTS.GRANTED) {
        await launchGallery(onImageSelected);
      } else if (requestResult === RESULTS.BLOCKED) {
        Alert.alert(
          "Quyền bị khóa",
          "Vui lòng vào Cài đặt > Quyền > Thư viện để cấp quyền"
        );
      } else {
        Alert.alert("Thư viện", "Bạn chưa cấp quyền truy cập thư viện ảnh");
      } 
    }
  } catch (error) {
    Alert.alert("Thư viện", "Không thể mở thư viện ảnh");
  }
};

const launchGallery = async (onImageSelected: (uri: string) => void) => {
  const result = await launchImageLibrary({
    mediaType: "photo",
  });

  if (result.assets && result.assets[0].uri) {
    onImageSelected(result.assets[0].uri);
  }
};
