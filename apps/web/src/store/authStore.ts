import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../lib/api';

export interface AuthCompany {
  id: string;
  name: string;
  number: number;
  city: string;
  logoUrl: string | null;
  dispatchSlug?: string | null;
}

export interface AuthUser {
  id: string;
  rut: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  companyId: string | null;
  isActive: boolean;
  company?: AuthCompany | null;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  patchUser: (partial: Partial<AuthUser>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });
        localStorage.setItem('nodo360_token', data.accessToken);
        set({ user: data.user, token: data.accessToken, isAuthenticated: true });
      },

      logout: () => {
        localStorage.removeItem('nodo360_token');
        set({ user: null, token: null, isAuthenticated: false });
      },

      patchUser: (partial) => {
        set((state) =>
          state.user ? { user: { ...state.user, ...partial } } : state,
        );
      },
    }),
    {
      name: 'nodo360_auth',
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    }
  )
);
