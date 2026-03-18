/**
 * Format a date as a relative time string using native Intl.RelativeTimeFormat.
 * Keeps relative-time formatting self-contained with no external date library.
 */

const DIVISIONS: { amount: number; unit: Intl.RelativeTimeFormatUnit }[] = [
  { amount: 60, unit: 'second' },
  { amount: 60, unit: 'minute' },
  { amount: 24, unit: 'hour' },
  { amount: 7, unit: 'day' },
  { amount: 4.345, unit: 'week' },
  { amount: 12, unit: 'month' },
  { amount: Number.POSITIVE_INFINITY, unit: 'year' },
];

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

export function formatRelativeTime(date: Date): string {
  let seconds = (date.getTime() - Date.now()) / 1000;

  for (const { amount, unit } of DIVISIONS) {
    if (Math.abs(seconds) < amount) {
      return rtf.format(Math.round(seconds), unit);
    }
    seconds /= amount;
  }

  return '';
}
