'use client';

import { createContext, useState, useEffect, useCallback } from 'react';
import { loginUser, registerUser, getMe, updateProfile as updateProfileApi } from '@/lib/api/auth';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: validate existing token with /me
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setIsLoading(false);
      return;
    }
    getMe()
      .then((data) => {
        setUser(data.user);
      })
      .catch(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  // Listen for 401 events fired by the API client interceptor
  useEffect(() => {
    const handleForceLogout = () => setUser(null);
    window.addEventListener('auth:logout', handleForceLogout);
    return () => window.removeEventListener('auth:logout', handleForceLogout);
  }, []);

  // Refresh user state after email verification
  useEffect(() => {
    const handleRefresh = () => {
      getMe().then((data) => setUser(data.user)).catch(() => {});
    };
    window.addEventListener('auth:refresh', handleRefresh);
    return () => window.removeEventListener('auth:refresh', handleRefresh);
  }, []);

  const login = useCallback(async (credentials) => {
    const data = await loginUser(credentials);
    localStorage.setItem('token', data.token);
    if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  }, []);

  const register = useCallback(async (fields) => {
    const data = await registerUser(fields);
    localStorage.setItem('token', data.token);
    if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('livipoint_cart');
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (fields) => {
    const data = await updateProfileApi(fields);
    const updatedUser = data.user;
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
    return data;
  }, []);

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
