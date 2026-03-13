import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

const KEY_USER_ID = "pinfire_user_id";
const KEY_USER_NAME = "pinfire_user_name";
const KEY_USER_EMAIL = "pinfire_user_email";

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
    await SecureStore.setItemAsync(KEY_USER_ID, userId);
    await SecureStore.setItemAsync(KEY_USER_NAME, name);
    await SecureStore.setItemAsync(KEY_USER_EMAIL, email);
    set({ userId, userName: name, userEmail: email });
  },

  signOut: async () => {
    await SecureStore.deleteItemAsync(KEY_USER_ID);
    await SecureStore.deleteItemAsync(KEY_USER_NAME);
    await SecureStore.deleteItemAsync(KEY_USER_EMAIL);
    set({ userId: null, userName: null, userEmail: null });
  },

  loadFromStorage: async () => {
    try {
      const userId = await SecureStore.getItemAsync(KEY_USER_ID);
      const userName = await SecureStore.getItemAsync(KEY_USER_NAME);
      const userEmail = await SecureStore.getItemAsync(KEY_USER_EMAIL);
      set({ userId, userName, userEmail, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },
}));
