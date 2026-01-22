// src/litigation/venues.js

export function normalizeVenue(input) {
  const v = String(input ?? '').trim().toLowerCase();
  if (!v) return 'common';

  // Allow a few common aliases.
  if (v === 'nj' || v === 'new jersey' || v === 'new-jersey') return 'nj';

  return v
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-\/]/g, '')
    .replace(/\-+/g, '-');
}

export function normalizeCourtDivision(input) {
  const d = String(input ?? '').trim().toLowerCase();
  if (!d) return '';

  if (d.includes('special') && d.includes('civil')) return 'special-civil';
  if (d.includes('law') && d.includes('division')) return 'law-division';

  return d
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '')
    .replace(/\-+/g, '-');
}
