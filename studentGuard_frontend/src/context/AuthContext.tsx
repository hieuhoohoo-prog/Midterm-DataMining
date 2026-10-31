import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api/client';
import { MetaResponse, TokenResponse, UserOut } from '../types';

interface AuthContextValue {
  token: string | null;
  user: UserOut | null;
  meta: MetaResponse | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('sg_token'));
  const [user, setUser] = useState<UserOut | null>(() => {
    const raw = localStorage.getItem('sg_user');
    return raw ? JSON.parse(raw) : null;
  });
  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchSessionAndMeta = async () => {
    const currentToken = localStorage.getItem('sg_token');
    if (!currentToken) {
      setLoading(false);
      return;
    }
    try {
      const [meRes, metaRes] = await Promise.all([
        api.get<UserOut>('/api/auth/me'),
        api.get<MetaResponse>('/api/meta'),
      ]);
      setUser(meRes.data);
      localStorage.setItem('sg_user', JSON.stringify(meRes.data));
      setMeta(metaRes.data);
    } catch {
      localStorage.removeItem('sg_token');
      localStorage.removeItem('sg_user');
      setToken(null);
      setUser(null);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionAndMeta();
  }, [token]);

  const login = async (username: string, password: string) => {
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);
    const res = await api.post<TokenResponse>('/api/auth/login', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    const newToken = res.data.access_token;
    localStorage.setItem('sg_token', newToken);
    setToken(newToken);

    const [meRes, metaRes] = await Promise.all([
      api.get<UserOut>('/api/auth/me', {
        headers: { Authorization: `Bearer ${newToken}` },
      }),
      api.get<MetaResponse>('/api/meta', {
        headers: { Authorization: `Bearer ${newToken}` },
      }),
    ]);
    setUser(meRes.data);
    localStorage.setItem('sg_user', JSON.stringify(meRes.data));
    setMeta(metaRes.data);
  };

  const logout = () => {
    localStorage.removeItem('sg_token');
    localStorage.removeItem('sg_user');
    setToken(null);
    setUser(null);
    setMeta(null);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        meta,
        loading,
        login,
        logout,
        refreshUser: fetchSessionAndMeta,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
};

