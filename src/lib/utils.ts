export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

export function uid(prefix = 'id'): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function todayISO(): string {
  const now = new Date();
  return toISODate(now);
}

export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseISODate(value: string): Date {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1, 12, 0, 0, 0);
}

export function addDays(value: string, days: number): string {
  const date = parseISODate(value);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

export function daysUntil(value?: string): number | null {
  if (!value) return null;
  const today = parseISODate(todayISO());
  const target = parseISODate(value);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

export function formatDate(value?: string): string {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('es-SV', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(parseISODate(value));
  } catch {
    return value;
  }
}

export function formatDateNumeric(value?: string): string {
  if (!value) return '—';
  const date = parseISODate(value);
  return `${`${date.getDate()}`.padStart(2, '0')}/${`${date.getMonth() + 1}`.padStart(2, '0')}/${date.getFullYear()}`;
}

export function formatDateTime(value: string): string {
  try {
    return new Intl.DateTimeFormat('es-SV', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function relativeTime(value: string): string {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'hace unos segundos';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `hace ${days} d`;
  return formatDate(value.slice(0, 10));
}

export function currency(value: number): string {
  return new Intl.NumberFormat('es-SV', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
}

export function initials(name: string): string {
  return name
    .replace(/,?\s*S\.A\.\s*de\s*C\.V\.?/gi, '')
    .replace(/[^\p{L}\s]/gu, ' ')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export function shortName(name: string): string {
  return name.replace(/,?\s*S\.A\.\s*de\s*C\.V\.?/gi, '').trim();
}

export function firstName(name: string): string {
  return shortName(name).split(/\s+/)[0] ?? name;
}

export function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

/** Genera un número pseudoaleatorio determinista a partir de una semilla. */
export function seeded(seed: number): () => number {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function fileSizeLabel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function truncate(value: string, length: number): string {
  if (value.length <= length) return value;
  return `${value.slice(0, length - 1)}…`;
}
