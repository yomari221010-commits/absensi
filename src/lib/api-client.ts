const TOKEN_KEY = "payrollin_token";

export interface PublicUser {
  id: number;
  employeeId: string;
  fullname: string;
  email: string;
  phone: string | null;
  role: "admin" | "employee";
  department: string | null;
  position: string | null;
  profilePhoto: string | null;
  joinDate: string | null;
}

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

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(path, { ...options, headers, cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? "Permintaan gagal");
  }
  return data as T;
}

export async function loginApi(email: string, password: string) {
  const data = await apiFetch<{ token: string; user: PublicUser }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setToken(data.token);
  return data.user;
}

export async function fetchProfile() {
  const data = await apiFetch<{ user: PublicUser }>("/api/profile");
  return data.user;
}

export async function logoutApi() {
  try {
    await apiFetch("/api/auth/logout", { method: "POST" });
  } finally {
    clearToken();
  }
}
