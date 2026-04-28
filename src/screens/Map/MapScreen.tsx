import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  SafeAreaView,
  StyleSheet,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import BottomBar from '../../components/BottomBar';
import { getPostsNearby, searchUsersByPrefix } from '../../services/firebase';
import { DEFAULT_AVATAR_URL } from '../../services/firebase/constants';
import { getCurrentCoordinates } from '../../utils/locationHelper';
import { safeImageUri } from '../../utils/imageSource';
import { RootStackParamList } from '../../navigation/RootNavigator';

type NearbyItem = {
  post_id: string;
  author_id: string;
  author_username: string;
  author_avatar?: string;
  restaurant_name: string;
  content: string;
  star_rating: number;
  created_at?: {
    toMillis?: () => number;
    seconds?: number;
    nanoseconds?: number;
  } | null;
  image_urls?: string[];
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  distance_km: number;
};

type UserSuggestion = {
  user_id: string;
  user_name: string;
  full_name: string;
  avatar_url?: string;
};

type MapMessage =
  | { type: 'ready' }
  | { type: 'marker_press'; id: string }
  | { type: 'region_change'; latitude: number; longitude: number; zoom: number };

const DEFAULT_CENTER = {
  latitude: 10.762622,
  longitude: 106.660172,
  zoom: 15,
};

const FETCH_RADIUS_KM = 6;
const MAP_BOTTOM_PADDING = 210;

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildMapHtml(centerLat: number, centerLng: number, zoom: number): string {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
      html, body, #map {
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        background: #111;
      }
      .leaflet-control-attribution {
        display: none;
      }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
      (function() {
        const map = L.map('map', {
          zoomControl: false,
          attributionControl: false,
        }).setView([${centerLat}, ${centerLng}], ${zoom});

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          crossOrigin: true,
        }).addTo(map);

        const markers = {};

        function post(type, payload) {
          if (!window.ReactNativeWebView) return;
          window.ReactNativeWebView.postMessage(JSON.stringify({ type, ...payload }));
        }

        window.syncMarkers = function(items) {
          Object.keys(markers).forEach((id) => {
            map.removeLayer(markers[id]);
            delete markers[id];
          });

          (items || []).forEach((item) => {
            if (!item || !item.location) return;
            const marker = L.circleMarker([item.location.lat, item.location.lng], {
              radius: item.isActive ? 9 : 7,
              color: item.isActive ? '#ffd400' : '#ffd400',
              fillColor: item.isActive ? '#ffd400' : '#1f1f1f',
              fillOpacity: 0.95,
              weight: 2,
            }).addTo(map);

            const popupText = '<b>' + String(item.restaurant_name || 'Nhà hàng') + '</b><br/>' + String(item.address || '');
            marker.bindPopup(popupText);

            marker.on('click', function() {
              post('marker_press', { id: String(item.post_id || '') });
            });

            markers[String(item.post_id)] = marker;
          });
        };

        window.focusMarker = function(id) {
          const marker = markers[String(id)];
          if (!marker) return;
          const latLng = marker.getLatLng();
          map.setView(latLng, Math.max(map.getZoom(), 16), { animate: true });
          marker.openPopup();
        };

        window.setCenter = function(lat, lng, zoomLevel) {
          const nextZoom = Number.isFinite(zoomLevel) ? zoomLevel : map.getZoom();
          map.setView([lat, lng], nextZoom, { animate: true });
        };

        map.on('moveend', function() {
          const c = map.getCenter();
          post('region_change', {
            latitude: c.lat,
            longitude: c.lng,
            zoom: map.getZoom(),
          });
        });

        post('ready', {});
      })();
    </script>
  </body>
</html>`;
}

function formatTimeAgo(createdAt: NearbyItem['created_at']): string {
  if (!createdAt) {
    return 'Vừa xong';
  }

  let createdAtMs = 0;
  if (typeof createdAt.toMillis === 'function') {
    createdAtMs = createdAt.toMillis();
  } else if (typeof createdAt.seconds === 'number') {
    createdAtMs = createdAt.seconds * 1000;
  }

  if (!createdAtMs) {
    return 'Vừa xong';
  }

  const diffSec = Math.max(1, Math.floor((Date.now() - createdAtMs) / 1000));
  if (diffSec < 60) return `${diffSec}s trước`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} giờ trước`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay} ngày trước`;
}

export default function MapScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const webRef = useRef<WebView | null>(null);
  const queryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const regionFetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const topOverlayInset = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 10 : 10;

  const [mapReady, setMapReady] = useState(false);
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [posts, setPosts] = useState<NearbyItem[]>([]);
  const [selectedPostId, setSelectedPostId] = useState<string>('');
  const [searchText, setSearchText] = useState('');
  const [userSuggestions, setUserSuggestions] = useState<UserSuggestion[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState('');

  const filteredPosts = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    if (!keyword) {
      return posts;
    }

    return posts.filter((item) => {
      const name = String(item.restaurant_name ?? '').toLowerCase();
      const author = String(item.author_username ?? '').toLowerCase();
      const address = String(item.location?.address ?? '').toLowerCase();
      return name.includes(keyword) || author.includes(keyword) || address.includes(keyword);
    });
  }, [posts, searchText]);

  const selectedPost = useMemo(
    () => posts.find((item) => item.post_id === selectedPostId) ?? filteredPosts[0] ?? null,
    [filteredPosts, posts, selectedPostId],
  );

  const fetchNearbyPosts = useCallback(async (latitude: number, longitude: number) => {
    setLoadingPosts(true);
    setError('');

    try {
      const data = await getPostsNearby({
        centerLat: latitude,
        centerLng: longitude,
        radiusKm: FETCH_RADIUS_KM,
      });

      const nextItems = data as NearbyItem[];
      setPosts(nextItems);
      setSelectedPostId((prev) => {
        const stillExists = nextItems.some((item) => item.post_id === prev);
        if (stillExists) {
          return prev;
        }
        return nextItems[0]?.post_id ?? '';
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể tải dữ liệu bản đồ');
    } finally {
      setLoadingPosts(false);
    }
  }, []);

  const syncMarkersToWeb = useCallback(() => {
    if (!mapReady || !webRef.current) {
      return;
    }

    const markerData = filteredPosts.map((item) => ({
      post_id: item.post_id,
      restaurant_name: escapeHtml(item.restaurant_name ?? ''),
      address: escapeHtml(item.location?.address ?? ''),
      location: item.location,
      isActive: selectedPost?.post_id === item.post_id,
    }));

    webRef.current.injectJavaScript(`window.syncMarkers(${JSON.stringify(markerData)}); true;`);
  }, [filteredPosts, mapReady, selectedPost]);

  useEffect(() => {
    syncMarkersToWeb();
  }, [syncMarkersToWeb]);

  const moveToCurrentLocation = useCallback(async () => {
    setError('');

    try {
      const current = await getCurrentCoordinates();
      const nextCenter = {
        latitude: current.lat,
        longitude: current.lng,
        zoom: 16,
      };

      setCenter(nextCenter);
      if (webRef.current) {
        webRef.current.injectJavaScript(
          `window.setCenter(${nextCenter.latitude}, ${nextCenter.longitude}, ${nextCenter.zoom}); true;`,
        );
      }

      await fetchNearbyPosts(nextCenter.latitude, nextCenter.longitude);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không lấy được vị trí hiện tại');
    }
  }, [fetchNearbyPosts]);

  useEffect(() => {
    void moveToCurrentLocation();

    return () => {
      if (queryTimerRef.current) {
        clearTimeout(queryTimerRef.current);
      }
      if (regionFetchTimerRef.current) {
        clearTimeout(regionFetchTimerRef.current);
      }
    };
  }, [moveToCurrentLocation]);

  useEffect(() => {
    const keyword = searchText.trim();
    if (!keyword) {
      setUserSuggestions([]);
      setLoadingUsers(false);
      return;
    }

    if (queryTimerRef.current) {
      clearTimeout(queryTimerRef.current);
    }

    setLoadingUsers(true);
    queryTimerRef.current = setTimeout(() => {
      void searchUsersByPrefix(keyword, 6)
        .then((users) => {
          setUserSuggestions(users as UserSuggestion[]);
        })
        .catch(() => {
          setUserSuggestions([]);
        })
        .finally(() => {
          setLoadingUsers(false);
        });
    }, 280);
  }, [searchText]);

  const onWebMessage = useCallback((event: WebViewMessageEvent) => {
    let payload: MapMessage | null = null;

    try {
      payload = JSON.parse(event.nativeEvent.data) as MapMessage;
    } catch {
      return;
    }

    if (!payload) {
      return;
    }

    if (payload.type === 'ready') {
      setMapReady(true);
      return;
    }

    if (payload.type === 'marker_press') {
      setSelectedPostId(payload.id);
      return;
    }

    if (payload.type === 'region_change') {
      const nextCenter = {
        latitude: payload.latitude,
        longitude: payload.longitude,
        zoom: payload.zoom,
      };
      setCenter(nextCenter);

      if (regionFetchTimerRef.current) {
        clearTimeout(regionFetchTimerRef.current);
      }

      regionFetchTimerRef.current = setTimeout(() => {
        void fetchNearbyPosts(nextCenter.latitude, nextCenter.longitude);
      }, 450);
    }
  }, [fetchNearbyPosts]);

  const focusPost = useCallback((post: NearbyItem) => {
    setSelectedPostId(post.post_id);
    if (webRef.current) {
      webRef.current.injectJavaScript(`window.focusMarker(${JSON.stringify(post.post_id)}); true;`);
    }
  }, []);

  const openPostProfile = useCallback(() => {
    if (!selectedPost) {
      return;
    }
    navigation.navigate('Profile', { userId: selectedPost.author_id });
  }, [navigation, selectedPost]);

  const suggestionVisible = searchText.trim().length > 0;
  const postSuggestions = filteredPosts.slice(0, 4);

  return (
    <SafeAreaView style={styles.container}>
      <WebView
        ref={webRef}
        source={{ html: buildMapHtml(center.latitude, center.longitude, center.zoom) }}
        originWhitelist={['*']}
        javaScriptEnabled
        onMessage={onWebMessage}
        style={styles.webview}
      />

      <View style={[styles.topOverlay, { top: topOverlayInset }]}>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color="#8d8d8d" />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm nhà hàng, bạn bè, vị trí"
            placeholderTextColor="#7e7e7e"
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
          />
          {searchText ? (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close" size={16} color="#8d8d8d" />
            </TouchableOpacity>
          ) : null}
        </View>

        {(loadingPosts || loadingUsers) ? (
          <View style={styles.loadingChip}>
            <ActivityIndicator color="#FFD400" size="small" />
            <Text style={styles.loadingChipText}>Đang tải...</Text>
          </View>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {suggestionVisible ? (
          <View style={styles.searchPanel}>
            {postSuggestions.map((item) => (
              <TouchableOpacity key={`post-${item.post_id}`} style={styles.suggestionRow} onPress={() => focusPost(item)}>
                <View style={styles.suggestionDot} />
                <View style={styles.suggestionTextWrap}>
                  <Text style={styles.suggestionTitle}>{item.restaurant_name}</Text>
                  <Text style={styles.suggestionSubtitle} numberOfLines={1}>{item.location?.address ?? 'Chưa có địa chỉ'}</Text>
                </View>
              </TouchableOpacity>
            ))}

            {userSuggestions.map((user) => (
              <TouchableOpacity
                key={`user-${user.user_id}`}
                style={styles.suggestionRow}
                onPress={() => navigation.navigate('Profile', { userId: user.user_id })}
              >
                <View style={styles.userBadge}>
                  <Ionicons name="person" size={14} color="#FFD400" />
                </View>
                <View style={styles.suggestionTextWrap}>
                  <Text style={styles.suggestionTitle}>{user.full_name}</Text>
                  <Text style={styles.suggestionSubtitle}>@{user.user_name}</Text>
                </View>
              </TouchableOpacity>
            ))}

            {!loadingUsers && !loadingPosts && postSuggestions.length === 0 && userSuggestions.length === 0 ? (
              <Text style={styles.emptyResult}>Không có kết quả phù hợp</Text>
            ) : null}
          </View>
        ) : null}
      </View>

      <TouchableOpacity style={styles.centerLocateButton} activeOpacity={0.85} onPress={() => void moveToCurrentLocation()}>
        <Ionicons name="navigate" size={20} color="#181210" />
      </TouchableOpacity>

      {selectedPost ? (
        <View style={styles.bottomCardWrap}>
          <TouchableOpacity style={styles.bottomCard} activeOpacity={0.9} onPress={openPostProfile}>
            <View style={styles.cardHeader}>
              <View style={styles.authorAvatarWrap}>
                {selectedPost.author_avatar ? (
                  <Image source={{ uri: safeImageUri(selectedPost.author_avatar, DEFAULT_AVATAR_URL) }} style={styles.authorAvatar} />
                ) : (
                  <View style={styles.authorAvatarFallback} />
                )}
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={styles.authorName}>{selectedPost.author_username}</Text>
                <Text style={styles.timeText}>{formatTimeAgo(selectedPost.created_at)}</Text>
              </View>
              <Text style={styles.distanceText}>{selectedPost.distance_km.toFixed(1)} km</Text>
            </View>

            <Text style={styles.restaurantName} numberOfLines={1}>{selectedPost.restaurant_name}</Text>
            <Text style={styles.addressText} numberOfLines={1}>{selectedPost.location?.address ?? 'Chưa có địa chỉ'}</Text>

            <View style={styles.cardBody}>
              <View style={styles.ratingRow}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Ionicons
                    key={n}
                    name={n <= Math.round(selectedPost.star_rating || 0) ? 'star' : 'star-outline'}
                    size={14}
                    color="#FFD400"
                  />
                ))}
              </View>
              {selectedPost.image_urls?.[0] ? (
                <Image source={{ uri: safeImageUri(selectedPost.image_urls?.[0]) }} style={styles.cardImage} />
              ) : null}
            </View>
          </TouchableOpacity>
        </View>
      ) : null}

      <BottomBar activeItem="map" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  webview: {
    flex: 1,
  },
  topOverlay: {
    position: 'absolute',
    left: 12,
    right: 12,
  },
  searchRow: {
    height: 46,
    borderRadius: 18,
    backgroundColor: 'rgba(22, 22, 22, 0.95)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#2b2b2b',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: '#f2f2f2',
    fontSize: 14,
  },
  loadingChip: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: 'rgba(22,22,22,0.95)',
    borderColor: '#2a2a2a',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingChipText: {
    color: '#d0d0d0',
    fontWeight: '600',
    fontSize: 12,
  },
  errorText: {
    color: '#ff7b7b',
    marginTop: 8,
    fontSize: 12,
  },
  searchPanel: {
    marginTop: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(24, 24, 24, 0.96)',
    borderColor: '#2f2f2f',
    borderWidth: 1,
    paddingVertical: 6,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  suggestionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
    backgroundColor: '#FFD400',
  },
  userBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#262115',
  },
  suggestionTextWrap: {
    flex: 1,
  },
  suggestionTitle: {
    color: '#f3f3f3',
    fontWeight: '700',
    fontSize: 13,
  },
  suggestionSubtitle: {
    color: '#9a9a9a',
    fontSize: 12,
    marginTop: 2,
  },
  emptyResult: {
    color: '#909090',
    textAlign: 'center',
    paddingVertical: 14,
  },
  centerLocateButton: {
    position: 'absolute',
    bottom: 180,
    alignSelf: 'center',
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFD400',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#c6a700',
  },
  bottomCardWrap: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 86,
    maxHeight: MAP_BOTTOM_PADDING,
  },
  bottomCard: {
    backgroundColor: 'rgba(24, 20, 19, 0.96)',
    borderWidth: 1,
    borderColor: '#2f2926',
    borderRadius: 18,
    padding: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorAvatarWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: '#4b4b4b',
  },
  authorAvatar: {
    width: '100%',
    height: '100%',
  },
  authorAvatarFallback: {
    flex: 1,
    backgroundColor: '#6d6d6d',
  },
  cardHeaderText: {
    marginLeft: 8,
    flex: 1,
  },
  authorName: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  timeText: {
    color: '#8e8e8e',
    fontSize: 11,
    marginTop: 1,
  },
  distanceText: {
    color: '#FFD400',
    fontSize: 12,
    fontWeight: '700',
  },
  restaurantName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 8,
  },
  addressText: {
    color: '#9d9d9d',
    marginTop: 4,
    fontSize: 12,
  },
  cardBody: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  ratingRow: {
    flexDirection: 'row',
    gap: 2,
    flex: 1,
  },
  cardImage: {
    width: 58,
    height: 58,
    borderRadius: 10,
    backgroundColor: '#2f2f2f',
  },
});