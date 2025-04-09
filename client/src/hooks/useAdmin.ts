import { useState, useCallback, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";

export function useAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user is already authenticated as admin
  const checkAdminStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/status', {
        credentials: 'include' // Include cookies for session-based auth
      });
      
      if (response.ok) {
        const data = await response.json();
        setIsAdmin(data.authenticated);
        return data.authenticated;
      } else {
        setIsAdmin(false);
        return false;
      }
    } catch (error) {
      console.error("Auth check error:", error);
      setIsAdmin(false);
      return false;
    }
  }, []);
  
  // 在钩子初始化时自动检查管理员状态
  useEffect(() => {
    checkAdminStatus();
  }, [checkAdminStatus]);

  // Login as admin
  const login = async (password: string): Promise<boolean> => {
    try {
      const response = await apiRequest('POST', '/api/auth/login', { password });
      const data = await response.json();
      
      if (data.success) {
        setIsAdmin(true);
        // 触发自定义事件，通知其他组件管理员状态已改变
        const adminStatusEvent = new CustomEvent('adminStatusChanged', { 
          detail: { isAdmin: true } 
        });
        window.dispatchEvent(adminStatusEvent);
      }
      return data.success;
    } catch (error) {
      console.error("Login error:", error);
      return false;
    }
  };

  // Logout from admin session
  const logout = async (): Promise<boolean> => {
    try {
      await apiRequest('POST', '/api/auth/logout', {});
      setIsAdmin(false);
      
      // 触发自定义事件，通知其他组件管理员状态已改变
      const adminStatusEvent = new CustomEvent('adminStatusChanged', { 
        detail: { isAdmin: false } 
      });
      window.dispatchEvent(adminStatusEvent);
      
      return true;
    } catch (error) {
      console.error("Logout error:", error);
      return false;
    }
  };

  return {
    isAdmin,
    checkAdminStatus,
    login,
    logout
  };
}
