export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7); // YYYY-MM
}

export function formatMonthLabel(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short' });
}

export function formatDayLabel(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  const today = new Date();
  const yesterday = addDays(today, -1);
  if (isoDate(d) === isoDate(today)) return 'Today';
  if (isoDate(d) === isoDate(yesterday)) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatFullDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

export function currentMonthKey(): string {
  return monthKey(isoDate(new Date()));
}

/** Time-of-day greeting for the Home screen header -- there's no user name
 * anywhere in this app (no accounts/login, by design), so this is the one
 * lightweight way "hi" can feel like it's actually looking at a clock
 * instead of a static "Overview" label every time. */
export function greetingForHour(hour: number = new Date().getHours()): string {
  if (hour < 5) return 'Still up?';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 22) return 'Good evening';
  return 'Still up?';
}
