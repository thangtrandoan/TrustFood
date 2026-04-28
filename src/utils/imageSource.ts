export const TRANSPARENT_PIXEL_URI = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';

export function safeImageUri(uri: string | null | undefined, fallback: string = TRANSPARENT_PIXEL_URI): string {
  const normalized = typeof uri === 'string' ? uri.trim() : '';
  return normalized.length > 0 ? normalized : fallback;
}
