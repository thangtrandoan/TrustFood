import { Alert, Platform } from 'react-native';
import { check, PERMISSIONS, request, RESULTS } from 'react-native-permissions';

function getLocationPermission() {
  if (Platform.OS === 'android') {
    return PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;
  }

  return PERMISSIONS.IOS.LOCATION_WHEN_IN_USE;
}

async function ensureLocationPermission(): Promise<boolean> {
  const permission = getLocationPermission();
  const status = await check(permission);

  if (status === RESULTS.GRANTED) {
    return true;
  }

  const requested = await request(permission);
  if (requested === RESULTS.GRANTED) {
    return true;
  }

  if (requested === RESULTS.BLOCKED) {
    Alert.alert('Quyen vi tri bi khoa', 'Vui long vao Cai dat va cap quyen vi tri cho ung dung.');
  }

  return false;
}

export async function getCurrentCoordinates(): Promise<{ lat: number; lng: number }> {
  const granted = await ensureLocationPermission();
  if (!granted) {
    throw new Error('LOCATION_PERMISSION_DENIED');
  }

  return new Promise((resolve, reject) => {
    const geolocation = (globalThis as any)?.navigator?.geolocation;
    if (!geolocation || typeof geolocation.getCurrentPosition !== 'function') {
      reject(new Error('LOCATION_SERVICE_UNAVAILABLE'));
      return;
    }

    geolocation.getCurrentPosition(
      (position: any) => {
        const lat = Number(position?.coords?.latitude);
        const lng = Number(position?.coords?.longitude);

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          reject(new Error('INVALID_LOCATION_COORDINATES'));
          return;
        }

        resolve({ lat, lng });
      },
      (error: any) => {
        reject(new Error(error?.message || 'LOCATION_FETCH_FAILED'));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      },
    );
  });
}
