import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AdminContextType {
  isAdmin: boolean;
  isLoading: boolean;
  login: (password: string) => Promise<boolean>;
  logout: () => Promise<boolean>;
  checkAdminStatus: (force?: boolean) => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkAdminStatus = async (force = false) => {
    const lastCheck = sessionStorage.getItem('admin_last_check');
    const now = Date.now();
    
    if (!force && lastCheck && now - parseInt(lastCheck) < 5000) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/status', {
        credentials: 'include',
        cache: 'no-store'
      });

      if (response.ok) {
        const data = await response.json();
        setIsAdmin(data.authenticated);
        sessionStorage.setItem('admin_last_check', now.toString());
      } else {
        setIsAdmin(false);
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Admin status check failed:', error);
      setIsAdmin(false);
      setIsLoading(false);
    }
  };

  const login = async (password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
        credentials: 'include'
      });

      if (response.ok) {
        setIsAdmin(true);
        sessionStorage.setItem('admin_last_check', Date.now().toString());
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const logout = async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });

      setIsAdmin(false);
      sessionStorage.removeItem('admin_last_check');
      
      return response.ok;
    } catch (error) {
      console.error('Logout failed:', error);
      setIsAdmin(false);
      return false;
    }
  };

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const value = {
    isAdmin,
    isLoading,
    login,
    logout,
    checkAdminStatus
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}