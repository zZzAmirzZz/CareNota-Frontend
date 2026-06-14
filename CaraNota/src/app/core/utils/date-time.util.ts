// core/utils/date-time.util.ts
// All backend datetime strings are NAIVE Egypt local time — no 'Z', no UTC conversion.

/**
 * Build a naive local datetime string "YYYY-MM-DDTHH:mm:ss" from a date and a time string.
 * @param dateInput - Date object or "YYYY-MM-DD" string (selected calendar day)
 * @param timeInput - "HH:mm" or "HH:mm:ss" (e.g. from available-slots or a time picker)
 */
export function buildLocalDateTime(dateInput: Date | string, timeInput: string): string {
  let datePart: string;

  if (typeof dateInput === 'string') {
    datePart = dateInput.split('T')[0]; // handles "2026-06-15" or "2026-06-15T00:00:00"
  } else {
    const y = dateInput.getFullYear();
    const m = String(dateInput.getMonth() + 1).padStart(2, '0');
    const d = String(dateInput.getDate()).padStart(2, '0');
    datePart = `${y}-${m}-${d}`;
  }

  const timePart = timeInput.length === 5 ? `${timeInput}:00` : timeInput; // ensure HH:mm:ss

  return `${datePart}T${timePart}`; // e.g. "2026-06-15T13:00:00"
}

/** Format a naive local datetime string as a display time, e.g. "1:00 PM" */
export function formatLocalTime(localString: string): string {
  const timePart = localString.split('T')[1] ?? '00:00:00';
  const [h, m] = timePart.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** Format a naive local datetime string as a display date, e.g. "Monday, June 15, 2026" */
export function formatLocalDate(localString: string): string {
  const datePart = localString.split('T')[0];
  const [y, m, d] = datePart.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString([], {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** Get a sortable timestamp from a naive local datetime string */
export function localDateTimeToSortable(localString: string): number {
  return new Date(localString.replace(' ', 'T')).getTime();
}
