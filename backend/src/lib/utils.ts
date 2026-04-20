export function log(context: string, message: string, data?: unknown): void {
  const ts = new Date().toISOString();
  const base = `[${ts}] [${context}] ${message}`;
  if (data !== undefined) {
    console.log(base, data);
  } else {
    console.log(base);
  }
}

export function logError(context: string, message: string, error?: unknown): void {
  const ts = new Date().toISOString();
  console.error(`[${ts}] [${context}] ERROR: ${message}`, error instanceof Error ? error.message : error);
}

/** Convert "HH:MM" to total minutes from midnight */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Convert total minutes to "HH:MM" */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Sleep for ms */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
