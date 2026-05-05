import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Linking,
} from "react-native";
import { Camera, useCameraDevice } from "react-native-vision-camera";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "@react-native-vector-icons/ionicons";
import { openPhoneGallery } from "../../utils/galleryHelper";

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

      <View style={styles.frameContainer}>
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
            <Ionicons name="images" size={24} color="#fff" />
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.captureWrapper} onPress={takePicture}>
          <View style={styles.captureBtn} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.smallBtn} onPress={handleFlipCamera}>
          <Ionicons name="camera-reverse" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.explore}>
        <TouchableOpacity onPress={() => navigation.navigate('Discover')}>
          <Text style={styles.exploreText}>Khám phá</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  centerFallback: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  fallbackTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  fallbackText: {
    color: '#bbb',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 18,
  },
  fallbackBtn: {
    backgroundColor: '#FFD400',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 18,
    marginBottom: 10,
  },
  fallbackBtnText: {
    color: '#111',
    fontWeight: '700',
  },
  fallbackGhostBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  fallbackGhostText: {
    color: '#FFD400',
    fontSize: 13,
  },

  topBar: {
    position: "absolute",
    top: 50,
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    zIndex: 20,
  },

  avatar: {
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

  dropdownText: { color: "#fff" },

  dropdownMenu: {
    position: "absolute",
    top: 35,
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
    fontSize: 14,
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
    backgroundColor: "rgba(0,0,0,0.4)",
    overflow: "hidden",
    position: "relative",
  },

  flashBadge: {
    position: "absolute",
    top: 15,
    left: 15,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },

  zoomBadge: {
    position: "absolute",
    top: 15,
    right: 15,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },

  bottomBar: {
    position: "absolute",
    bottom: 80,
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
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
  },

  explore: {
    position: "absolute",
    bottom: 30,
    alignSelf: "center",
  },

  badgeText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },

  exploreText: {
    color: "#FFD400",
  },
});
