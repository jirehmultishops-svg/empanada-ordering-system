import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthResponse, getToken, setToken, clearToken, login as apiLogin, register as apiRegister } from '../api';

interface User {
  id: string;
  username: string;
  name: string;
  whatsapp: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (data: { name: string; whatsapp: string; username: string; password: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (token) {
      // Try to decode user from stored data
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          clearToken();
          localStorage.removeItem('user');
        }
      }
    }
    setIsLoading(false);
  }, []);

  const handleAuthResponse = useCallback((response: AuthResponse) => {
    setToken(response.token);
    const userData: User = {
      id: response.client.id,
      username: response.client.username,
      name: response.client.name,
      whatsapp: response.client.whatsapp,
      role: response.client.role,
    };
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const response = await apiLogin({ username, password });
    handleAuthResponse(response);
  }, [handleAuthResponse]);

  const register = useCallback(async (data: { name: string; whatsapp: string; username: string; password: string }) => {
    const response = await apiRegister(data);
    handleAuthResponse(response);
  }, [handleAuthResponse]);

  const logout = useCallback(() => {
    clearToken();
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
