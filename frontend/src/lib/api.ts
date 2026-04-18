"use client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const TOKEN_KEY = "prowasapp.token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(public status: number, public body: unknown, message?: string) {
    super(message ?? `API ${status}`);
  }
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const { auth = true, headers, ...rest } = options;
  const token = auth ? getToken() : null;
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* some endpoints return empty bodies */
  }
  if (!res.ok) {
    throw new ApiError(res.status, body, (body as any)?.error ?? res.statusText);
  }
  return body as T;
}

export async function apiUpload<T = unknown>(path: string, formData: FormData): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    method: "POST",
    body: formData,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, body);
  return body as T;
}

export function apiUrl(path: string) {
  return `${API_URL}/api/v1${path}`;
}

export function sseUrl(path: string) {
  const token = getToken();
  const sep = path.includes("?") ? "&" : "?";
  return `${API_URL}/api/v1${path}${sep}access_token=${encodeURIComponent(token ?? "")}`;
}
