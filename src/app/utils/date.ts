/**
 * Local date as `YYYY-MM-DD` using local date components (not UTC).
 *
 * Shared by the service and the UI so date-only comparisons and storage use the
 * same criterion and avoid UTC drift. Do NOT build dates from `new Date('YYYY-MM-DD')`,
 * which is parsed as UTC and can shift the day.
 */
export function localDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
