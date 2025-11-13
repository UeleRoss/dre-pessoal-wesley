import { DEFAULT_CATEGORIES } from "@/constants/categories";
import { DEFAULT_BUSINESS_UNITS } from "@/types/business-unit";
import { localDb } from "./local-db";
import { generateId } from "@/utils/id";
import type { Statement } from "./local-db";

const USERS_KEY = "dre_offline_users";
const SESSION_KEY = "dre_offline_session";

type StoredUser = {
  id: string;
  email: string;
  password: string;
  displayName: string;
};

export type LocalUser = Pick<StoredUser, "id" | "email" | "displayName">;

const DEFAULT_USER: StoredUser = {
  id: "local-user",
  email: "offline@dre.local",
  password: "offline123",
  displayName: "Usuário Offline",
};

const listeners = new Set<(user: LocalUser | null) => void>();

const isBrowser = () => typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const readUsers = (): StoredUser[] => {
  if (!isBrowser()) {
    return [DEFAULT_USER];
  }

  const raw = window.localStorage.getItem(USERS_KEY);
  if (!raw) {
    window.localStorage.setItem(USERS_KEY, JSON.stringify([DEFAULT_USER]));
    return [DEFAULT_USER];
  }

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length) {
      return parsed;
    }
  } catch (error) {
    console.warn("Não foi possível ler usuários locais. Recriando arquivo.", error);
  }

  window.localStorage.setItem(USERS_KEY, JSON.stringify([DEFAULT_USER]));
  return [DEFAULT_USER];
};

const persistUsers = (users: StoredUser[]) => {
  if (!isBrowser()) return;
  window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

const toLocalUser = (user: StoredUser): LocalUser => ({
  id: user.id,
  email: user.email,
  displayName: user.displayName,
});

const getSession = (): LocalUser | null => {
  if (!isBrowser()) return null;
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.id && parsed?.email) {
      return parsed;
    }
  } catch (error) {
    console.warn("Sessão inválida, limpando storage.", error);
  }
  window.localStorage.removeItem(SESSION_KEY);
  return null;
};

const persistSession = (user: LocalUser | null) => {
  if (!isBrowser()) return;
  if (!user) {
    window.localStorage.removeItem(SESSION_KEY);
    return;
  }
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
};

const emit = (user: LocalUser | null) => {
  listeners.forEach((listener) => listener(user));
};

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const temporaryPassword = () => Math.random().toString(36).slice(-8);

const seedDefaultsForUser = async (user: LocalUser) => {
  const timestamp = new Date().toISOString();
  const statements: Statement[] = [
    {
      sql: `INSERT INTO user_profiles (
              id, user_id, display_name, onboarding_completed, theme_color, avatar_url, created_at, updated_at
            )
            VALUES (?, ?, ?, 1, '#2563eb', NULL, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
              display_name = excluded.display_name,
              updated_at = excluded.updated_at`,
      params: [generateId(), user.id, user.displayName, timestamp, timestamp],
    },
  ];

  DEFAULT_CATEGORIES.forEach((category) => {
    statements.push({
      sql: `INSERT OR IGNORE INTO categories (id, user_id, name, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)`,
      params: [generateId(), user.id, category, timestamp, timestamp],
    });
  });

  DEFAULT_BUSINESS_UNITS.forEach((unit) => {
    statements.push({
      sql: `INSERT OR IGNORE INTO business_units (id, user_id, name, color, icon, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      params: [generateId(), user.id, unit.name, unit.color, unit.icon, timestamp, timestamp],
    });
  });

  try {
    await localDb.transaction(statements);
  } catch (error) {
    console.warn("Falha ao semear dados padrão para o usuário local.", error);
  }
};

const findUser = (email: string, users: StoredUser[]) =>
  users.find((user) => user.email === normalizeEmail(email));

export const authService = {
  async getSession(): Promise<LocalUser | null> {
    return getSession();
  },

  onAuthStateChange(callback: (user: LocalUser | null) => void) {
    listeners.add(callback);
    return () => listeners.delete(callback);
  },

  async signIn(email: string, password: string): Promise<LocalUser> {
    const users = readUsers();
    const target = findUser(email, users);
    if (!target || target.password !== password) {
      throw new Error("Credenciais inválidas para o modo offline.");
    }

    const localUser = toLocalUser(target);
    persistSession(localUser);
    emit(localUser);
    await seedDefaultsForUser(localUser);
    return localUser;
  },

  async signUp(email: string, password: string): Promise<LocalUser> {
    if (password.length < 6) {
      throw new Error("A senha deve ter pelo menos 6 caracteres.");
    }

    const users = readUsers();
    if (findUser(email, users)) {
      throw new Error("Este email já está cadastrado no modo offline.");
    }

    const displayName = email.split("@")[0]?.trim() || "Usuário";
    const newUser: StoredUser = {
      id: generateId(),
      email: normalizeEmail(email),
      password,
      displayName,
    };

    const updated = [...users, newUser];
    persistUsers(updated);

    const localUser = toLocalUser(newUser);
    persistSession(localUser);
    emit(localUser);
    await seedDefaultsForUser(localUser);
    return localUser;
  },

  async signOut() {
    persistSession(null);
    emit(null);
  },

  async requestPasswordReset(email: string) {
    const users = readUsers();
    const target = findUser(email, users);
    if (!target) {
      throw new Error("Usuário não encontrado.");
    }

    const newPassword = temporaryPassword();
    target.password = newPassword;
    persistUsers(users);
    return newPassword;
  },
};
