/// <reference types="vite/client" />

export function env(key: string, fallback = "false"): boolean {
  const value = (import.meta.env[key] as string | undefined) ?? fallback;
  return value === "true";
}
