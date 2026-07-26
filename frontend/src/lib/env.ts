const DEFAULT_API_URL = "http://0.0.0.0:8000";
const DEFAULT_API_TIMEOUT_MS = 15000;

function parseNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const env = {
  apiUrl: (process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL).replace(/\/$/, ""),
  apiTimeoutMs: parseNumber(process.env.NEXT_PUBLIC_API_TIMEOUT_MS, DEFAULT_API_TIMEOUT_MS),
  enableQueryDevtools: process.env.NEXT_PUBLIC_ENABLE_QUERY_DEVTOOLS !== "false",
};
