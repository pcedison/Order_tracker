import { useState, useCallback, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export function useAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // 簡化的狀態檢查函數
  const checkAdminStatus = useCallback(async (force = false) => {
    // 避免過於頻繁的檢查
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
        // 觸發全局事件通知其他組件狀態變更
        window.dispatchEvent(new CustomEvent('adminStatusChanged', { detail: { isAdmin: true } }));
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
      // 觸發全局事件通知其他組件狀態變更
      window.dispatchEvent(new CustomEvent('adminStatusChanged', { detail: { isAdmin: false } }));
      
      return response.ok;
    } catch (error) {
      console.error('Logout failed:', error);
      setIsAdmin(false);
      return false;
    }
  }, []);

  // 組件掛載時檢查狀態
  useEffect(() => {
    checkAdminStatus();
  }, [checkAdminStatus]);

  return {
    isAdmin,
    isLoading,
    login,
    logout,
    checkAdminStatus
  };
}