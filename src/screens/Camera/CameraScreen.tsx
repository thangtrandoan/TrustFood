import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Linking,
  Dimensions,
} from "react-native";
import { Camera, useCameraDevice } from "react-native-vision-camera";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "@react-native-vector-icons/ionicons";
import { openPhoneGallery } from "../../utils/galleryHelper";

const { width, height } = Dimensions.get("window");
const baseWidth = 375;
const scale = (size: number) => (width / baseWidth) * size;
const moderateScale = (size: number, factor = 0.5) =>
  size + (scale(size) - size) * factor;
const frameSize = Math.min(width * 0.9, height * 0.55);
const frameOffset = Math.max(scale(6), height * 0.012);
const modeBarHeight = scale(44);
const topInset = Math.max(scale(10), height * 0.04);
const bottomInset = Math.max(scale(8), height * 0.03);

export default function CameraScreen() {
  const [cameraPosition, setCameraPosition] = useState<"back" | "front">("back");
  const [flash, setFlash] = useState<"off" | "on" | "auto">("off");
  const [zoom, setZoom] = useState<number>(1);
  const backDevice = useCameraDevice("back");
  const frontDevice = useCameraDevice("front");
  const device = cameraPosition === "back" ? backDevice : frontDevice;
  const camera = useRef<Camera>(null);
  const navigation = useNavigation<any>();

  const [hasPermission, setHasPermission] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState("Mọi người");
  const [pickingImage, setPickingImage] = useState(false);

  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === "granted");
    })();
  }, []);

  if (!device) {
    return (
      <View style={styles.centerFallback}>
        <Text style={styles.fallbackTitle}>Không tìm thấy camera</Text>
        <Text style={styles.fallbackText}>Thiết bị/emulator hiện tại không có camera khả dụng.</Text>
        <TouchableOpacity style={styles.fallbackBtn} onPress={() => navigation.navigate('Discover')}>
          <Text style={styles.fallbackBtnText}>Mở Khám phá</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.centerFallback}>
        <Text style={styles.fallbackTitle}>Chưa có quyền Camera</Text>
        <Text style={styles.fallbackText}>Hãy cấp quyền camera để dùng màn chụp ảnh.</Text>
        <TouchableOpacity style={styles.fallbackBtn} onPress={() => Linking.openSettings()}>
          <Text style={styles.fallbackBtnText}>Mở Cài đặt</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.fallbackGhostBtn} onPress={() => navigation.navigate('Discover')}>
          <Text style={styles.fallbackGhostText}>Bỏ qua và vào Khám phá</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const takePicture = async () => {
    const photo = await camera.current?.takePhoto({
      flash: device?.hasFlash ? flash : 'off',
    });
    if (photo) {
      const rawPath = String(photo.path ?? '');
      const normalizedUri = rawPath.startsWith('file://') ? rawPath : `file://${rawPath}`;
      console.log('[camera] captured_cache_uri', normalizedUri);
      navigation.navigate("Send", {
        imageUri: normalizedUri,
      });
    }
  };

  const openProfile = () => {
    navigation.navigate('Profile');
  };

  const handleFlipCamera = () => {
    const nextPosition = cameraPosition === "back" ? "front" : "back";
    const nextDevice = nextPosition === "back" ? backDevice : frontDevice;

    if (!nextDevice) {
      Alert.alert('Thiết bị không hỗ trợ', 'Không tìm thấy camera phù hợp để chuyển.');
      return;
    }

    setCameraPosition(nextPosition);
  };

  const handlePickFromGallery = async () => {
    if (pickingImage) {
      return;
    }

    setPickingImage(true);
    try {
      await openPhoneGallery((imageUri) => {
        if (!imageUri) {
          return;
        }
        navigation.navigate("Send", { imageUri });
      });
    } finally {
      setPickingImage(false);
    }
  };

  return (
    <View style={styles.container}>
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

      <View style={styles.content}>
        <View style={styles.frame}>
          <Camera
            ref={camera}
            style={StyleSheet.absoluteFill}
            device={device}
            isActive
            photo
            zoom={zoom}
          />
          <TouchableOpacity
            style={styles.flashBadge}
            onPress={() => {
              if (!device?.hasFlash) {
                Alert.alert("Thông báo", "Thiết bị không hỗ trợ flash.");
                return;
              }
              setFlash(prev => prev === "off" ? "on" : prev === "on" ? "auto" : "off");
            }}
          >
            <Text style={styles.badgeText}>
              {flash === "off" ? "⚡ Tắt" : flash === "on" ? "⚡ Bật" : "⚡ Auto"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.zoomBadge}
            onPress={() => {
              let nextZoom = zoom + 1;
              const maxZ = Math.min(3, device?.maxZoom ?? 3);
              if (nextZoom > maxZ) {
                nextZoom = 1;
              }
              setZoom(nextZoom);
            }}
          >
            <Text style={styles.badgeText}>{zoom}x</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.bottomSection}>
        <View style={styles.modeSpacer} />
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.smallBtn}
            onPress={() => {
              void handlePickFromGallery();
            }}
            disabled={pickingImage}
          >
            {pickingImage ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="images" size={moderateScale(24)} color="#fff" />
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.captureWrapper} onPress={takePicture}>
            <View style={styles.captureBtn} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.smallBtn} onPress={handleFlipCamera}>
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
  centerFallback: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(20),
  },
  fallbackTitle: {
    color: '#fff',
    fontSize: moderateScale(18),
    fontWeight: '700',
    marginBottom: scale(10),
    textAlign: 'center',
  },
  fallbackText: {
    color: '#bbb',
    fontSize: moderateScale(13),
    textAlign: 'center',
    marginBottom: scale(16),
  },
  fallbackBtn: {
    backgroundColor: '#FFD400',
    paddingHorizontal: scale(18),
    paddingVertical: scale(10),
    borderRadius: scale(18),
    marginBottom: scale(10),
  },
  fallbackBtnText: {
    color: '#111',
    fontWeight: '700',
    fontSize: moderateScale(13),
  },
  fallbackGhostBtn: {
    paddingHorizontal: scale(10),
    paddingVertical: scale(8),
  },
  fallbackGhostText: {
    color: '#FFD400',
    fontSize: moderateScale(12),
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

  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  frame: {
    width: frameSize,
    height: frameSize,
    borderRadius: scale(26),
    backgroundColor: "rgba(0,0,0,0.4)",
    overflow: "hidden",
    position: "relative",
    transform: [{ translateY: -frameOffset }],
  },

  flashBadge: {
    position: "absolute",
    top: scale(12),
    left: scale(12),
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: scale(12),
    paddingVertical: scale(6),
    borderRadius: scale(16),
  },

  zoomBadge: {
    position: "absolute",
    top: scale(12),
    right: scale(12),
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: scale(12),
    paddingVertical: scale(6),
    borderRadius: scale(16),
  },

  bottomSection: {
    alignItems: 'center',
    paddingTop: scale(6),
  },

  modeSpacer: {
    height: modeBarHeight,
    width: "100%",
  },

  bottomBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    width: "100%",
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
  },

  explore: {
    alignSelf: "center",
  },

  badgeText: {
    color: "#fff",
    fontSize: moderateScale(12),
    fontWeight: "bold",
  },

  exploreText: {
    color: "#FFD400",
    fontSize: moderateScale(13),
  },
});
