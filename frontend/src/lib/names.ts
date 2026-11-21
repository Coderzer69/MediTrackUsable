// Doctor names are sometimes stored with a "Dr." prefix already; add it only once.
export const withDr = (name?: string | null, fallback = 'Unknown') =>
  !name ? `Dr. ${fallback}` : /^dr\.?\s/i.test(name.trim()) ? name.trim() : `Dr. ${name.trim()}`;
