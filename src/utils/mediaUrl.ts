/**
 * Media URL helpers. Uploaded files live in IndexedDB; localStorage only stores ids/metadata.
 */

export function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('Failed to read file as data URL'));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
    reader.readAsDataURL(blob);
  });
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return readBlobAsDataUrl(file);
}

/** URLs that can be used directly in img/video src */
export function isDisplayableMediaUrl(url: string | undefined): boolean {
  if (!url) return false;
  return (
    url.startsWith('data:') ||
    url.startsWith('blob:') ||
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('./') ||
    url.startsWith('/')
  );
}

/** Never persist blob/data URLs — they bloat localStorage and break after reload */
export function stripMediaUrlForPersistence(url?: string): string {
  if (!url) return '';
  if (url.startsWith('blob:') || url.startsWith('data:')) return '';
  return url;
}

export function sanitizeUploadedFileUrls<T extends { url?: string }>(files: T[]): T[] {
  return files.map((file) => ({
    ...file,
    url: stripMediaUrlForPersistence(file.url),
  }));
}

/** localStorage must not contain embedded file bytes */
export function isOversizedAssetsCache(raw: string): boolean {
  if (raw.length > 120_000) return true;
  return raw.includes('"data:image') || raw.includes('"data:video');
}
