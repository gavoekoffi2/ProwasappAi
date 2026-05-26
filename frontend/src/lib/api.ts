"use client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const TOKEN_KEY = "prowasapp.token";
// 20s is comfortably above any expected backend latency. If a request takes
// longer it's almost certainly a stuck network or a dead backend.
const REQUEST_TIMEOUT_MS = 20_000;

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

function handleUnauthorized() {
  if (typeof window === "undefined") return;
  clearToken();
  // Avoid redirect loops on the auth pages themselves.
  const p = window.location.pathname;
  if (p !== "/login" && p !== "/register") {
    window.location.href = "/login";
  }
}

function normalizeError(err: unknown): never {
  // Browsers throw TypeError("Failed to fetch") for network failures, CORS,
  // DNS errors. Translate to something users (and other code) can act on.
  if (err instanceof TypeError) {
    throw new ApiError(
      0,
      null,
      "Service indisponible. Vérifiez votre connexion ou réessayez dans quelques instants.",
    );
  }
  if (err instanceof DOMException && err.name === "AbortError") {
    throw new ApiError(
      0,
      null,
      "Délai d'attente dépassé. Le serveur met trop de temps à répondre.",
    );
  }
  throw err as Error;
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const { auth = true, headers, ...rest } = options;
  const token = auth ? getToken() : null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/v1${path}`, {
      ...rest,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });
  } catch (err) {
    normalizeError(err);
    throw err; // Unreachable; satisfies TS.
  } finally {
    clearTimeout(timer);
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* empty body */
  }
  if (res.status === 401 && auth) {
    handleUnauthorized();
  }
  if (!res.ok) {
    throw new ApiError(res.status, body, (body as { error?: string })?.error ?? res.statusText);
  }
  return body as T;
}

export async function apiUpload<T = unknown>(path: string, formData: FormData): Promise<T> {
  const token = getToken();
  // Uploads can be large — give them a longer window than regular requests.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000);

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/v1${path}`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
  } catch (err) {
    normalizeError(err);
    throw err;
  } finally {
    clearTimeout(timer);
  }

  const body = await res.json().catch(() => null);
  if (res.status === 401) handleUnauthorized();
  if (!res.ok) throw new ApiError(res.status, body);
  return body as T;
}

export function apiUrl(path: string) {
  return `${API_URL}/api/v1${path}`;
}
