export const sanitizeImageUrl = (value?: string | null): string => {
  if (typeof value !== 'string') return '';

  const trimmed = value.trim();
  if (!trimmed || trimmed === '""' || trimmed === "''") return '';

  return trimmed.replace(/["']/g, '').trim();
};
