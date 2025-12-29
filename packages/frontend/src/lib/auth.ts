import { browser } from "$app/environment";
import { writable, derived } from "svelte/store";
import type { User, Tenant } from "./types";
import { auth } from "./api/client";

interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  token: string | null;
  loading: boolean;
  initialized: boolean;
}

function createAuthStore() {
  const initial: AuthState = {
    user: null,
    tenant: null,
    token: null,
    loading: true,
    initialized: false,
  };

  const { subscribe, set, update } = writable<AuthState>(initial);

  function saveToken(token: string) {
    if (browser) localStorage.setItem("token", token);
  }

  function clearToken() {
    if (browser) localStorage.removeItem("token");
  }

  return {
    subscribe,

    async init() {
      if (!browser) return;

      const token = localStorage.getItem("token");
      if (!token) {
        set({ ...initial, loading: false, initialized: true });
        return;
      }

      try {
        const { user, tenant } = await auth.me();
        set({
          user,
          tenant: tenant ?? null,
          token,
          loading: false,
          initialized: true,
        });
      } catch {
        clearToken();
        set({ ...initial, loading: false, initialized: true });
      }
    },

    setAuth(token: string, user: User, tenant?: Tenant) {
      saveToken(token);
      set({
        user,
        tenant: tenant ?? null,
        token,
        loading: false,
        initialized: true,
      });
    },

    logout() {
      clearToken();
      set({ ...initial, loading: false, initialized: true });
    },
  };
}

export const authStore = createAuthStore();

export const isAuthenticated = derived(authStore, ($auth) => !!$auth.user);
export const isOwner = derived(
  authStore,
  ($auth) => $auth.user?.role === "owner" || $auth.user?.role === "admin"
);
export const currentUser = derived(authStore, ($auth) => $auth.user);
export const currentTenant = derived(authStore, ($auth) => $auth.tenant);
