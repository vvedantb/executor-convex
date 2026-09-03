export async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function randomToken(bytes = 24): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function formatApiKey(role: "admin" | "mcp", secret: string): string {
  return `exc_${role}_${secret}`;
}

export function keyPrefix(key: string): string {
  return key.slice(0, 16);
}
