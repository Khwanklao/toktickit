const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export const REQUESTER_STORAGE_KEY = "toktickit_requester_id";

export function getStoredRequesterId(): string | null {
  return localStorage.getItem(REQUESTER_STORAGE_KEY);
}

export function setStoredRequesterId(id: number | string | null): void {
  if (id === null || id === undefined) {
    localStorage.removeItem(REQUESTER_STORAGE_KEY);
  } else {
    localStorage.setItem(REQUESTER_STORAGE_KEY, String(id));
  }
}

export interface RequestOptions extends RequestInit {
  headers?: Record<string, string>;
}

export async function apiFetch(endpoint: string, options: RequestOptions = {}): Promise<Response> {
  const url = endpoint.startsWith("http") ? endpoint : `${API_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  const headers: Record<string, string> = {
    ...(options.headers || {}),
  };

  // Only add Content-Type: application/json if body is present and not FormData
  if (options.body && !(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  // Automatically attach x-requester-id if stored in localStorage
  const storedId = getStoredRequesterId();
  if (storedId && !headers["x-requester-id"]) {
    headers["x-requester-id"] = storedId;
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

export const apiClient = {
  fetch: apiFetch,
  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    const res = await apiFetch(endpoint, { ...options, method: "GET" });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `Request failed with status ${res.status}`);
    }
    return res.json();
  },
  async post<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    const res = await apiFetch(endpoint, {
      ...options,
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `Request failed with status ${res.status}`);
    }
    return res.json();
  },
  async delete<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    const res = await apiFetch(endpoint, {
      ...options,
      method: "DELETE",
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `Request failed with status ${res.status}`);
    }
    return res.json();
  },
};
