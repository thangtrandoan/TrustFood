import firestore from '@react-native-firebase/firestore';
import { distanceBetween, geohashQueryBounds } from 'geofire-common';
import { POSTS_COLLECTION, PRIVACY_MODES } from './constants';
import { requireAuthUid } from './authGuard';
import type { PostDocument } from './types';

export type NearbyPostItem = PostDocument & {
  distance_km: number;
};

function assertMapInput(input: { centerLat: number; centerLng: number; radiusKm: number }): void {
  if (
    !Number.isFinite(input.centerLat) ||
    !Number.isFinite(input.centerLng) ||
    input.centerLat < -90 ||
    input.centerLat > 90 ||
    input.centerLng < -180 ||
    input.centerLng > 180
  ) {
    throw new Error('INVALID_CENTER_COORDINATES');
  }

  if (!Number.isFinite(input.radiusKm) || input.radiusKm <= 0) {
    throw new Error('INVALID_RADIUS');
  }
}

function isPostPublic(post: Partial<PostDocument>): boolean {
  const candidate = post as Partial<PostDocument> & { privacyMode?: string };
  const value = String(candidate.privacy_mode ?? candidate.privacyMode ?? '').toLowerCase();
  if (!value) {
    return true;
  }
  return value !== PRIVACY_MODES.private;
}

export async function getPostsNearby(input: {
  centerLat: number;
  centerLng: number;
  radiusKm: number;
  limitPerBound?: number;
}): Promise<NearbyPostItem[]> {
  requireAuthUid();
  assertMapInput(input);

  const center: [number, number] = [input.centerLat, input.centerLng];
  const safeRadiusKm = Math.min(input.radiusKm, 50);
  const radiusInM = safeRadiusKm * 1000;
  const bounds = geohashQueryBounds(center, radiusInM);
  const limitPerBound = Math.max(1, Math.min(100, Math.floor(input.limitPerBound ?? 40)));

  const queries = bounds.map(([start, end]) =>
    firestore()
      .collection(POSTS_COLLECTION)
      .orderBy('location.geohash')
      .startAt(start)
      .endAt(end)
      .limit(limitPerBound)
      .get(),
  );

  const snapshots = await Promise.all(queries);

  const matched: NearbyPostItem[] = [];
  const seen = new Set<string>();

  for (const snap of snapshots) {
    for (const doc of snap.docs) {
      if (seen.has(doc.id)) {
        continue;
      }

      const post = doc.data() as PostDocument;
      if (!isPostPublic(post)) {
        continue;
      }

      const postLat = post.location?.lat;
      const postLng = post.location?.lng;

      if (typeof postLat !== 'number' || typeof postLng !== 'number') {
        continue;
      }

      // distanceBetween uses the Haversine formula, so we post-filter by exact radius.
      const distKm = distanceBetween([postLat, postLng], center);
      if (distKm <= safeRadiusKm) {
        seen.add(doc.id);
        matched.push({
          ...post,
          distance_km: distKm,
        });
      }
    }
  }

  matched.sort((a, b) => a.distance_km - b.distance_km);
  return matched;
}
