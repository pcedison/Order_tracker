import { useState, useCallback, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export function useAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();

  // 簡化的狀態檢查函數，減少頻繁請求
  const checkAdminStatus = useCallback(async (force = false) => {
    // 避免過於頻繁的檢查
    const lastCheck = sessionStorage.getItem('admin_last_check');
    const now = Date.now();
    
    if (!force && lastCheck && now - parseInt(lastCheck) < 5000) {
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
    } catch (error) {
      console.error('Admin status check failed:', error);
      setIsAdmin(false);
    }
  }, []);

  // 登入函數
  const login = useCallback(async (password: string): Promise<boolean> => {
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
  }, []);

  // 登出函數
  const logout = useCallback(async (): Promise<boolean> => {
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
  }, []);

  // 監聽自定義事件
  useEffect(() => {
    const handleAdminLogin = () => {
      checkAdminStatus(true);
    };

    const handleAdminLogout = () => {
      logout();
    };

    window.addEventListener('adminLogin', handleAdminLogin);
    window.addEventListener('adminLogout', handleAdminLogout);

    // 初始檢查
    checkAdminStatus();

    return () => {
      window.removeEventListener('adminLogin', handleAdminLogin);
      window.removeEventListener('adminLogout', handleAdminLogout);
    };
  }, [checkAdminStatus, logout]);

  return {
    isAdmin,
    login,
    logout,
    checkAdminStatus
  };
}