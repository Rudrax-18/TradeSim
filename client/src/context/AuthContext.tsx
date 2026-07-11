import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { setAccessToken } from '../services/api';

interface User {
  id: string;
  name: string;
  email?: string;
  phoneNumber?: string;
  walletBalance: number;
  watchlist: string[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  loginWithToken: (token: string, refreshToken?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Helper to update token both in react state and Axios client memory
  const updateToken = (newToken: string | null) => {
    setTokenState(newToken);
    setAccessToken(newToken || '');
  };

  // Perform silent refresh on app load
  useEffect(() => {
    const silentRefresh = async () => {
      const storedRefreshToken = localStorage.getItem('refreshToken');
      try {
        const response = await api.post('/api/auth/refresh', { refreshToken: storedRefreshToken });
        const { accessToken, refreshToken: newRefreshToken, user: userData } = response.data;
        updateToken(accessToken);
        if (newRefreshToken) {
          localStorage.setItem('refreshToken', newRefreshToken);
        }
        setUser(userData);
      } catch (err) {
        // Safe to ignore on boot, means no refresh cookie/token exists
        console.log('No active session found on load.');
        localStorage.removeItem('refreshToken');
      } finally {
        setIsLoading(false);
      }
    };

    silentRefresh();

    // Listen for session expiry event from Axios response interceptor
    const handleSessionExpired = () => {
      setUser(null);
      updateToken(null);
      localStorage.removeItem('refreshToken');
    };

    window.addEventListener('auth-session-expired', handleSessionExpired);
    return () => {
      window.removeEventListener('auth-session-expired', handleSessionExpired);
    };
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await api.post('/api/auth/login', { email, password });
      const { accessToken, refreshToken, user: userData } = response.data;
      updateToken(accessToken);
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }
      setUser(userData);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await api.post('/api/auth/register', { name, email, password });
      const { accessToken, refreshToken, user: userData } = response.data;
      updateToken(accessToken);
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }
      setUser(userData);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithToken = async (accessToken: string, refreshToken?: string) => {
    setIsLoading(true);
    try {
      updateToken(accessToken);
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }
      const response = await api.get('/api/auth/me');
      setUser(response.data.user);
    } catch (error) {
      updateToken(null);
      setUser(null);
      localStorage.removeItem('refreshToken');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await api.post('/api/auth/logout');
    } catch (err) {
      console.error('Logout error on server:', err);
    } finally {
      updateToken(null);
      setUser(null);
      localStorage.removeItem('refreshToken');
      setIsLoading(false);
    }
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        loginWithToken,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
