export function getBackendBaseUrl(): string {
  const fromEnv =
    process.env.BACKEND_URL ??
    process.env.NEXT_PUBLIC_BACKEND_URL ??
    "http://localhost:3001";
  return fromEnv.replace(/\/+$/, "");
}
