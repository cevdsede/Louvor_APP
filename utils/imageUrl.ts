export const sanitizeImageUrl = (value?: string | null): string => {
  if (typeof value !== 'string') return '';

  const trimmed = value.trim();
  if (!trimmed || trimmed === '""' || trimmed === "''") return '';

  return trimmed.replace(/["']/g, '').trim();
};

export const getPublicAssetsPathFromUrl = (value?: string | null): string => {
  const sanitized = sanitizeImageUrl(value);
  if (!sanitized || sanitized.startsWith('data:') || sanitized.startsWith('blob:')) return '';

  try {
    const url = new URL(sanitized);
    const marker = '/storage/v1/object/public/public-assets/';
    const markerIndex = url.pathname.indexOf(marker);

    if (markerIndex === -1) return '';

    return decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
  } catch {
    return '';
  }
};
