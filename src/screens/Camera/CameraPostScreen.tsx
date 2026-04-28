import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from "react-native";
import RNFS from 'react-native-fs';
import { useRoute, useNavigation } from "@react-navigation/native";
import Ionicons from "@react-native-vector-icons/ionicons";
import { openPhoneGallery } from "../../utils/galleryHelper";
import { getCurrentCoordinates } from "../../utils/locationHelper";
import { createPost, requireAuthUid, uploadSingleImage } from "../../services/firebase";
import { safeImageUri } from '../../utils/imageSource';

export default function CameraPostScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { imageUri } = route.params;
  const [selectedImageUri, setSelectedImageUri] = useState(String(imageUri ?? ''));
  const didCompletePostRef = useRef(false);

  useEffect(() => {
    setSelectedImageUri(String(imageUri ?? ''));
  }, [imageUri]);

  const isRemoteHttpUrl = (uri: string): boolean => /^https?:\/\//i.test(uri);

  const isLikelyCacheUri = (uri: string): boolean => {
    const trimmed = String(uri ?? '').trim();
    if (!trimmed.startsWith('file://')) {
      return false;
    }

    return /\/cache\/|\\cache\\|\/Caches\//i.test(trimmed);
  };

  const cleanupTempImage = async (uri: string, reason: string) => {
    if (!isLikelyCacheUri(uri)) {
      return;
    }

    try {
      const path = uri.replace('file://', '');
      const exists = await RNFS.exists(path);
      if (!exists) {
        return;
      }

      await RNFS.unlink(path);
      console.log('[camera-post] temp_image_deleted', { uri, reason });
    } catch (error) {
      console.log('[camera-post] temp_image_delete_failed', {
        uri,
        reason,
        error: error instanceof Error ? error.message : 'unknown_error',
      });
    }
  };

  useEffect(() => {
    return () => {
      if (!didCompletePostRef.current) {
        void cleanupTempImage(selectedImageUri, 'screen_unmount_or_cancel');
      }
    };
  }, [selectedImageUri]);

  const [mode, setMode] = useState<"send" | "review">("send");
  const [rating, setRating] = useState(4);
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [locationLoading, setLocationLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState("Mọi người");
  const [address, setAddress] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [priceRange, setPriceRange] = useState('200000 - 300000');
  const [openingTime, setOpeningTime] = useState('08:00');
  const [closingTime, setClosingTime] = useState('22:00');
  const [content, setContent] = useState('');
  const [lat, setLat] = useState('10.762622');
  const [lng, setLng] = useState('106.660172');

  const parsePriceRange = (raw: string) => {
    const numbers = (raw.match(/\d+/g) || []).map((value) => Number(value));
    const safeNumbers = numbers.filter((value) => Number.isFinite(value) && value >= 0);

    if (safeNumbers.length === 0) {
      return { min: 0, max: 0 };
    }

    if (safeNumbers.length === 1) {
      return { min: safeNumbers[0], max: safeNumbers[0] };
    }

    return {
      min: Math.min(safeNumbers[0], safeNumbers[1]),
      max: Math.max(safeNumbers[0], safeNumbers[1]),
    };
  };

  const handleSend = async () => {
    if (mode === 'review' && (!restaurantName.trim() || !address.trim())) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên nhà hàng và địa chỉ trước khi gửi.');
      return;
    }

    const parsedLat = Number(lat);
    const parsedLng = Number(lng);
    if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
      Alert.alert('Tọa độ không hợp lệ', 'Vui lòng kiểm tra lại lat/lng trước khi đăng bài.');
      return;
    }

    try {
      const parsedPrice = parsePriceRange(priceRange);
      let preUploadedImage: { imageUrl: string; imagePath: string } | undefined;

      setLoading(true);
      setIsUploading(true);
      setUploadPercent(0);
      let imagePathForPost = selectedImageUri;

      if (!isRemoteHttpUrl(selectedImageUri)) {
        console.log('[camera-post] upload_source_uri', selectedImageUri);

        const uid = requireAuthUid();
        const draftPostId = `draft-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;

        try {
          const uploaded = await uploadSingleImage({
            uid,
            postId: draftPostId,
            index: 0,
            localUri: selectedImageUri,
          });

          preUploadedImage = uploaded;
          imagePathForPost = uploaded.imageUrl;
          await cleanupTempImage(selectedImageUri, 'upload_success');
        } catch (error) {
          console.error('[camera-post] upload_single_image_failed', {
            sourceUri: selectedImageUri,
            message: error instanceof Error ? error.message : 'unknown_error',
          });
          throw error;
        }
      }

      await createPost({
        restaurantName: restaurantName.trim() || 'Nhà hàng chưa đặt tên',
        starRating: rating,
        content: content.trim() || 'Không có nội dung đánh giá',
        imageLocalPaths: [imagePathForPost],
        priceMin: parsedPrice.min,
        priceMax: parsedPrice.max,
        openingTime: openingTime.trim() || '00:00',
        closingTime: closingTime.trim() || '23:59',
        privacyMode: selectedOption === 'Chỉ mình tôi' ? 'private' : 'public',
        location: {
          lat: parsedLat,
          lng: parsedLng,
          address: address.trim() || 'Chưa cập nhật địa chỉ',
        },
      }, {
        preUploadedImages: preUploadedImage ? [preUploadedImage] : undefined,
        onUploadProgress: (progress) => {
          setUploadPercent(progress.percent);
        },
      });
      didCompletePostRef.current = true;
      setIsUploading(false);
      setLoading(false);
      Alert.alert("Thành công", "Bài review đã được đăng");
      navigation.popToTop();
    } catch (e) {
      setIsUploading(false);
      setLoading(false);
      const isUploadFail = e instanceof Error && e.message.startsWith('UPLOAD_IMAGE_FAILED');
      const uploadParts = isUploadFail ? e.message.split(':') : [];
      const uploadCode = uploadParts[1] || 'unknown';
      const uploadStage = uploadParts[2] || 'unknown_stage';
      const uploadUriKind = uploadParts[3] || 'unknown_uri';
      const message = isUploadFail
        ? `Không tải được ảnh lên cloud (${uploadCode}, ${uploadStage}, ${uploadUriKind}). Vui lòng thử lại.`
        : e instanceof Error
          ? e.message
          : 'Gửi thất bại';
      Alert.alert("Lỗi", message);
    }
  };

  const handleUseCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      const current = await getCurrentCoordinates();

      const nextLat = current.lat.toFixed(6);
      const nextLng = current.lng.toFixed(6);

      setLat(nextLat);
      setLng(nextLng);
      if (!address.trim()) {
        setAddress(`Lat ${nextLat}, Lng ${nextLng}`);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Không lấy được vị trí hiện tại';
      Alert.alert('Vị trí', message);
    } finally {
      setLocationLoading(false);
    }
  };

  const openProfile = () => {
    navigation.navigate('Profile');
  };

return (
    <View style={styles.container}>
      {/* TOP BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.avatar} onPress={openProfile} activeOpacity={0.8} />
        <TouchableOpacity
          style={styles.dropdown}
          onPress={() => setDropdownOpen(!dropdownOpen)}
        >
          <Text style={styles.dropdownText}>{selectedOption} ▾</Text>
        </TouchableOpacity>

        {dropdownOpen && (
          <View style={styles.dropdownMenu}>
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => {
                setSelectedOption("Mọi người");
                setDropdownOpen(false);
              }}
            >
              <Text style={styles.dropdownItemText}>Mọi người</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => {
                setSelectedOption("Chỉ mình tôi");
                setDropdownOpen(false);
              }}
            >
              <Text style={styles.dropdownItemText}>Chỉ mình tôi</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* SEND MODE */}
      {mode === "send" && (
        <View style={styles.frameContainer}>
          <View style={styles.frame}>
            <Image source={{ uri: safeImageUri(selectedImageUri) }} style={styles.previewImage} />
            <View style={styles.flashBadge}>
              <Text style={styles.badgeText}>⚡</Text>
            </View>
            <View style={styles.zoomBadge}>
              <Text style={styles.badgeText}>1x</Text>
            </View>
          </View>
        </View>
      )}

      {/* REVIEW MODE */}
      {mode === "review" && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.imageWrapper}>
            <Image source={{ uri: safeImageUri(selectedImageUri) }} style={styles.image} />
          </View>

          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((i) => (
              <TouchableOpacity key={i} onPress={() => setRating(i)}>
                <Ionicons
                  name={i <= rating ? "star" : "star-outline"}
                  size={32}
                  color="#FFD400"
                />
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Vị trí</Text>
          <View style={styles.input}>
            <Ionicons name="location" size={18} color="#FFD400" />
            <TextInput
              placeholder="Nhập địa chỉ"
              placeholderTextColor="#999"
              style={styles.textInput}
              value={address}
              onChangeText={setAddress}
            />
          </View>

          <TouchableOpacity
            style={[styles.locationButton, locationLoading && styles.locationButtonDisabled]}
            onPress={handleUseCurrentLocation}
            disabled={locationLoading}
          >
            <Ionicons name="locate-outline" size={16} color="#181210" />
            <Text style={styles.locationButtonText}>
              {locationLoading ? 'Đang lấy vị trí...' : 'Dùng vị trí hiện tại'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.label}>Tên nhà hàng</Text>
          <View style={styles.input}>
            <TextInput
              placeholder="Tên nhà hàng"
              placeholderTextColor="#999"
              style={styles.textInput}
              value={restaurantName}
              onChangeText={setRestaurantName}
            />
          </View>

          <Text style={styles.label}>Giá cả</Text>
          <View style={styles.input}> 
            <TextInput
              placeholder="Ví dụ: 200000 - 300000"
              placeholderTextColor="#999"
              style={styles.textInput}
              keyboardType="default"
              value={priceRange}
              onChangeText={setPriceRange}
            />
          </View>

          <Text style={styles.label}>Giờ mở cửa</Text>
          <View style={styles.coordRow}>
            <View style={[styles.input, styles.halfInput]}>
              <TextInput
                placeholder="Mở cửa"
                placeholderTextColor="#999"
                style={styles.textInput}
                value={openingTime}
                onChangeText={setOpeningTime}
              />
            </View>
            <View style={[styles.input, styles.halfInput]}>
              <TextInput
                placeholder="Đóng cửa"
                placeholderTextColor="#999"
                style={styles.textInput}
                value={closingTime}
                onChangeText={setClosingTime}
              />
            </View>
          </View>

          <Text style={styles.label}>Đánh giá chi tiết</Text>
          <View style={styles.reviewTextArea}>
            <TextInput
              placeholder="Viết đánh giá của bạn"
              placeholderTextColor="#888"
              multiline
              textAlignVertical="top"
              style={styles.reviewInput}
              value={content}
              onChangeText={setContent}
            />
          </View>
        </ScrollView>
      )}

      {/* MODE SWITCH */}
      <View style={styles.modeContainer}>
        {mode === "send" ? (
          <TouchableOpacity style={styles.switchButton} onPress={() => setMode("review")} disabled={loading}>
            <Text style={styles.switchButtonText}>Điền thông tin</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.closeButton} onPress={() => setMode("send")} disabled={loading}>
            <Ionicons name="close" size={18} color="#181210" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.uploadStatusWrap}>
          <Text style={styles.uploadStatusText}>
            {isUploading ? `Đang tải ảnh... ${uploadPercent}%` : 'Đang hoàn tất bài đăng...'}
          </Text>
        </View>
      ) : null}

      {/* BOTTOM BAR */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.smallBtn}
          disabled={loading}
          onPress={() =>
            openPhoneGallery((uri) => {
              setSelectedImageUri(uri);
            })
          }
        >
          <Ionicons name="images" size={24} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.captureWrapper}
          onPress={handleSend}
          disabled={loading}
        >
          <View style={styles.captureBtn}>
            {loading ? (
              <View style={styles.captureLoadingWrap}>
                <ActivityIndicator color="#000" size="small" />
                <Text style={styles.captureLoadingText}>{isUploading ? `${uploadPercent}%` : '...'}</Text>
              </View>
            ) : (
              <Ionicons name="send" size={32} color="#000" />
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.smallBtn}>
          <Ionicons name="camera-reverse" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },

  topBar: {
    position: "absolute",
    top: 0,
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    zIndex: 20,
    backgroundColor: "#000",
    paddingTop: 50,
    paddingBottom: 10,
  },

  avatar: {
    bottom: 6,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#999",
    position: "absolute",
    left: 20,
  },

  dropdown: {
    backgroundColor: "#333",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },

  dropdownText: {
    color: "#fff",
  },

  dropdownMenu: {
    position: "absolute",
    top: 85,
    backgroundColor: "#222",
    borderRadius: 12,
    overflow: "hidden",
    minWidth: 150,
    zIndex: 30,
  },

  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },

  dropdownItemText: {
    color: "#fff",
  },

  frameContainer: {
    position: "absolute",
    top: 120,
    width: "100%",
    alignItems: "center",
  },

  frame: {
    width: 360,
    height: 360,
    borderRadius: 30,
    overflow: "hidden",
  },

  previewImage: {
    width: "100%",
    height: "100%",
  },

  flashBadge: {
    position: "absolute",
    top: 10,
    left: 10,
  },

  zoomBadge: {
    position: "absolute",
    top: 10,
    right: 10,
  },

  badgeText: {
    color: "#fff",
  },

  scrollContent: {
    paddingTop: 140,
    paddingHorizontal: 20,
    paddingBottom: 280,
  },

  imageWrapper: {
    alignItems: "center",
    marginBottom: 15,
  },

  image: {
    width: 90,
    height: 90,
    borderRadius: 16,
  },

  starRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 20,
  },

  label: {
    color: "#fff",
    marginBottom: 6,
  },

  input: {
    backgroundColor: "#2a2a2a",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    marginBottom: 16,
    height: 46,
    gap: 8,
  },

  textInput: {
    flex: 1,
    color: "#fff",
  },
  coordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  halfInput: {
    flex: 1,
  },
  locationButton: {
    backgroundColor: '#FFD400',
    borderRadius: 10,
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: -6,
    marginBottom: 16,
  },
  locationButtonDisabled: {
    opacity: 0.7,
  },
  locationButtonText: {
    color: '#181210',
    fontWeight: '700',
  },

  reviewTextArea: {
    backgroundColor: "#2a2a2a",
    borderRadius: 12,
    padding: 12,
    minHeight: 180,
    marginBottom: 10,
  },
  reviewInput: {
    color: '#fff',
    minHeight: 150,
  },

  modeContainer: {
    position: "absolute",
    bottom: 170,
    height: 52,
    width: "100%",
    alignItems: "center",
    justifyContent: 'center',
    backgroundColor: "#000",
    zIndex: 15,
  },
  uploadStatusWrap: {
    position: 'absolute',
    bottom: 150,
    width: '100%',
    alignItems: 'center',
    zIndex: 16,
  },
  uploadStatusText: {
    color: '#F7F7F7',
    fontSize: 13,
    fontWeight: '600',
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  switchButton: {
    minWidth: 150,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD400',
    paddingHorizontal: 18,
  },
  switchButtonText: {
    color: '#181210',
    fontWeight: '700',
    fontSize: 14,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD400',
  },

  bottomBar: {
    position: "absolute",
    paddingBottom: 80,
    bottom: 0,
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#000",
    paddingVertical: 8,
    zIndex: 10,
  },

  smallBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  captureWrapper: {
    borderWidth: 3,
    borderColor: "#FFD400",
    borderRadius: 50,
    padding: 5,
  },

  captureBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  captureLoadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  captureLoadingText: {
    color: '#1A1A1A',
    fontSize: 11,
    fontWeight: '700',
  },
});