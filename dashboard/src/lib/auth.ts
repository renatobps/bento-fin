const TOKEN_KEY = "bento_token";
const USER_KEY = "bento_user";

export interface StoredUser {
  id: number;
  phone: string;
  name: string | null;
  email?: string | null;
}

export function updateStoredUser(partial: Partial<StoredUser>): void {
  const current = getUser();
  const token = getToken();
  if (!current || !token) return;
  saveSession(token, { ...current, ...partial });
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as StoredUser) : null;
}

export function saveSession(token: string, user: StoredUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
