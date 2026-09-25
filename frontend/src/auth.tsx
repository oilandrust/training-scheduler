import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  deleteAccount as deleteAccountRequest,
  getMe,
  logout as logoutRequest,
  type AuthUser,
} from './api';

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      setUser(await getMe());
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const logout = async () => {
    await logoutRequest();
    setUser(null);
  };

  const deleteAccount = async () => {
    await deleteAccountRequest();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, refresh, logout, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}
