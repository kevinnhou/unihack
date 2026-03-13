import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

const KEY_USER_ID = "agon_user_id";
const KEY_USER_NAME = "agon_user_name";
const KEY_USER_EMAIL = "agon_user_email";

// In-memory fallback when SecureStore is unavailable (e.g. some simulators)
const memStore = new Map<string, string>();

async function storeSet(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    memStore.set(key, value);
  }
}

async function storeGet(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return memStore.get(key) ?? null;
  }
}

async function storeDel(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    memStore.delete(key);
  }
}

type AuthState = {
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  /** true while checking SecureStore on app launch */
  isLoading: boolean;
  signIn: (userId: string, name: string, email: string) => Promise<void>;
  signOut: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  userName: null,
  userEmail: null,
  isLoading: true,

  signIn: async (userId, name, email) => {
    await storeSet(KEY_USER_ID, userId);
    await storeSet(KEY_USER_NAME, name);
    await storeSet(KEY_USER_EMAIL, email);
    set({ userId, userName: name, userEmail: email });
  },

  signOut: async () => {
    await storeDel(KEY_USER_ID);
    await storeDel(KEY_USER_NAME);
    await storeDel(KEY_USER_EMAIL);
    set({ userId: null, userName: null, userEmail: null });
  },

  loadFromStorage: async () => {
    try {
      const userId = await storeGet(KEY_USER_ID);
      const userName = await storeGet(KEY_USER_NAME);
      const userEmail = await storeGet(KEY_USER_EMAIL);
      set({ userId, userName, userEmail, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },
}));
