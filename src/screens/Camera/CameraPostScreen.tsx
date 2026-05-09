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
  Dimensions,
} from "react-native";
import RNFS from 'react-native-fs';
import { useRoute, useNavigation } from "@react-navigation/native";
import Ionicons from "@react-native-vector-icons/ionicons";
import { openPhoneGallery } from "../../utils/galleryHelper";
import { getCurrentCoordinates } from "../../utils/locationHelper";
import { createPost, requireAuthUid, uploadSingleImage } from "../../services/firebase";
import { safeImageUri } from '../../utils/imageSource';

const { width, height } = Dimensions.get('window');
const baseWidth = 375;
const scale = (size: number) => (width / baseWidth) * size;
const moderateScale = (size: number, factor = 0.5) =>
  size + (scale(size) - size) * factor;
const frameSize = Math.min(width * 0.9, height * 0.55);
const frameOffset = Math.max(scale(6), height * 0.012);
const modeBarHeight = scale(44);
const topInset = Math.max(scale(10), height * 0.04);
const bottomInset = Math.max(scale(8), height * 0.03);

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
        <View style={styles.topBarCenter}>
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
        <View style={styles.topBarSpacer} />
      </View>

      <View style={[styles.contentArea, mode === "send" ? styles.centerContent : styles.topContent]}>
        {/* SEND MODE */}
        {mode === "send" && (
          <View style={styles.frame}>
            <Image source={{ uri: safeImageUri(selectedImageUri) }} style={styles.previewImage} />
            <View style={styles.flashBadge}>
              <Text style={styles.badgeText}>⚡</Text>
            </View>
            <View style={styles.zoomBadge}>
              <Text style={styles.badgeText}>1x</Text>
            </View>
          </View>
        )}

        {/* REVIEW MODE */}
        {mode === "review" && (
          <ScrollView
            style={styles.reviewScroll}
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
                    size={moderateScale(30)}
                    color="#FFD400"
                  />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Vị trí</Text>
            <View style={styles.input}>
              <Ionicons name="location" size={moderateScale(18)} color="#FFD400" />
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
              <Ionicons name="locate-outline" size={moderateScale(16)} color="#181210" />
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
      </View>

      <View style={styles.bottomSection}>
        {/* MODE SWITCH */}
        <View style={styles.modeContainer}>
          {mode === "send" ? (
            <TouchableOpacity style={styles.switchButton} onPress={() => setMode("review")} disabled={loading}>
              <Text style={styles.switchButtonText}>Điền thông tin</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.closeButton} onPress={() => setMode("send")} disabled={loading}>
              <Ionicons name="close" size={moderateScale(18)} color="#181210" />
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
            <Ionicons name="images" size={moderateScale(24)} color="#fff" />
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
                <Ionicons name="send" size={moderateScale(30)} color="#000" />
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.smallBtn}>
            <Ionicons name="camera-reverse" size={moderateScale(24)} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.explore}>
          <TouchableOpacity onPress={() => navigation.navigate('Discover')}>
            <Text style={styles.exploreText}>Khám phá</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    paddingHorizontal: scale(16),
    paddingTop: topInset,
    paddingBottom: bottomInset,
  },

  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 20,
    marginBottom: scale(6),
  },

  avatar: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: "#999",
  },

  topBarCenter: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },

  topBarSpacer: {
    width: scale(40),
    height: scale(40),
  },

  dropdown: {
    backgroundColor: "#333",
    paddingHorizontal: scale(12),
    paddingVertical: scale(6),
    borderRadius: scale(20),
  },

  dropdownText: {
    color: "#fff",
    fontSize: moderateScale(13),
  },

  dropdownMenu: {
    position: "absolute",
    top: scale(38),
    backgroundColor: "#222",
    borderRadius: scale(12),
    overflow: "hidden",
    minWidth: width * 0.4,
    zIndex: 30,
  },

  dropdownItem: {
    paddingVertical: scale(10),
    paddingHorizontal: scale(14),
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },

  dropdownItemText: {
    color: "#fff",
    fontSize: moderateScale(13),
  },

  contentArea: {
    flex: 1,
    width: '100%',
  },

  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  topContent: {
    justifyContent: 'flex-start',
  },

  frame: {
    width: frameSize,
    height: frameSize,
    borderRadius: scale(26),
    overflow: "hidden",
    alignSelf: 'center',
    transform: [{ translateY: -frameOffset }],
  },

  previewImage: {
    width: "100%",
    height: "100%",
  },

  flashBadge: {
    position: "absolute",
    top: scale(10),
    left: scale(10),
  },

  zoomBadge: {
    position: "absolute",
    top: scale(10),
    right: scale(10),
  },

  badgeText: {
    color: "#fff",
    fontSize: moderateScale(12),
  },

  scrollContent: {
    paddingTop: scale(10),
    paddingHorizontal: scale(16),
    paddingBottom: scale(16),
  },

  reviewScroll: {
    flex: 1,
  },

  imageWrapper: {
    alignItems: "center",
    marginBottom: scale(12),
  },

  image: {
    width: Math.min(scale(90), width * 0.28),
    height: Math.min(scale(90), width * 0.28),
    borderRadius: scale(16),
  },

  starRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: scale(16),
  },

  label: {
    color: "#fff",
    marginBottom: scale(6),
    fontSize: moderateScale(13),
  },

  input: {
    backgroundColor: "#2a2a2a",
    borderRadius: scale(12),
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(12),
    marginBottom: scale(12),
    height: scale(46),
    gap: scale(8),
  },

  textInput: {
    flex: 1,
    color: "#fff",
    fontSize: moderateScale(14),
  },
  coordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: scale(10),
  },
  halfInput: {
    flex: 1,
  },
  locationButton: {
    backgroundColor: '#FFD400',
    borderRadius: scale(10),
    minHeight: scale(42),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    marginTop: scale(2),
    marginBottom: scale(12),
  },
  locationButtonDisabled: {
    opacity: 0.7,
  },
  locationButtonText: {
    color: '#181210',
    fontWeight: '700',
    fontSize: moderateScale(13),
  },

  reviewTextArea: {
    backgroundColor: "#2a2a2a",
    borderRadius: scale(12),
    padding: scale(12),
    minHeight: Math.max(scale(120), height * 0.16),
    marginBottom: scale(10),
  },
  reviewInput: {
    color: '#fff',
    minHeight: Math.max(scale(110), height * 0.14),
    fontSize: moderateScale(14),
  },
  bottomSection: {
    paddingTop: scale(6),
    alignItems: 'center',
  },

  modeContainer: {
    height: modeBarHeight,
    width: "100%",
    alignItems: "center",
    justifyContent: 'center',
  },
  uploadStatusWrap: {
    width: '100%',
    alignItems: 'center',
    marginTop: scale(6),
    marginBottom: scale(4),
  },
  uploadStatusText: {
    color: '#F7F7F7',
    fontSize: moderateScale(12),
    fontWeight: '600',
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    borderRadius: scale(12),
    paddingHorizontal: scale(12),
    paddingVertical: scale(6),
  },
  switchButton: {
    minWidth: width * 0.4,
    height: scale(38),
    borderRadius: scale(19),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD400',
    paddingHorizontal: scale(18),
  },
  switchButtonText: {
    color: '#181210',
    fontWeight: '700',
    fontSize: moderateScale(13),
  },
  closeButton: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(19),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD400',
  },

  bottomBar: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginTop: scale(8),
    marginBottom: scale(6),
  },

  smallBtn: {
    width: scale(40),
    height: scale(40),
    alignItems: "center",
    justifyContent: "center",
  },

  captureWrapper: {
    borderWidth: scale(3),
    borderColor: "#FFD400",
    borderRadius: scale(50),
    padding: scale(5),
  },

  captureBtn: {
    width: scale(70),
    height: scale(70),
    borderRadius: scale(35),
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  captureLoadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(2),
  },
  captureLoadingText: {
    color: '#1A1A1A',
    fontSize: moderateScale(11),
    fontWeight: '700',
  },

  explore: {
    alignSelf: "center",
  },

  exploreText: {
    color: "#FFD400",
    fontSize: moderateScale(13),
  },
});