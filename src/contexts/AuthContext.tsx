"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  isAuthenticated: boolean;
  user: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Admin credentials (in a real app, this would be handled server-side)
  const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: 'admin123'
  };

  useEffect(() => {
    // Check authentication status on mount
    const checkAuth = () => {
      try {
        const authStatus = localStorage.getItem('isAuthenticated');
        const adminUser = localStorage.getItem('adminUser');
        
        // Also check cookies for middleware compatibility
        const cookies = document.cookie.split(';').reduce((acc, cookie) => {
          const [key, value] = cookie.trim().split('=');
          acc[key] = value;
          return acc;
        }, {} as Record<string, string>);
        
        if ((authStatus === 'true' && adminUser) || cookies.isAuthenticated === 'true') {
          setIsAuthenticated(true);
          setUser(adminUser || cookies.adminUser || 'admin');
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('adminUser', username);
        
        // Set cookie for middleware
        document.cookie = `isAuthenticated=true; path=/; max-age=${60 * 60 * 24 * 7}`; // 7 days
        document.cookie = `adminUser=${username}; path=/; max-age=${60 * 60 * 24 * 7}`;
        
        setIsAuthenticated(true);
        setUser(username);
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('adminUser');
    
    // Remove cookies
    document.cookie = 'isAuthenticated=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'adminUser=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    
    setIsAuthenticated(false);
    setUser(null);
    router.push('/login');
  };

  const value = {
    isAuthenticated,
    user,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 