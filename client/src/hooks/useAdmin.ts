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

  // 監聽自定義事件和組件掛載時檢查
  useEffect(() => {
    const handleAdminLogin = () => {
      checkAdminStatus(true);
    };

    const handleAdminLogout = () => {
      logout();
    };

    // 監聽存儲變化事件，確保跨組件狀態同步
    const handleStorageChange = () => {
      checkAdminStatus(true);
    };

    window.addEventListener('adminLogin', handleAdminLogin);
    window.addEventListener('adminLogout', handleAdminLogout);
    window.addEventListener('storage', handleStorageChange);

    // 初始檢查
    checkAdminStatus();

    // 設定定期檢查，確保狀態同步
    const interval = setInterval(() => {
      checkAdminStatus();
    }, 10000); // 每10秒檢查一次

    return () => {
      window.removeEventListener('adminLogin', handleAdminLogin);
      window.removeEventListener('adminLogout', handleAdminLogout);
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [checkAdminStatus, logout]);

  return {
    isAdmin,
    login,
    logout,
    checkAdminStatus
  };
}