import { useState, useCallback } from "react";
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
      } else {
        setIsAdmin(false);
      }
    } catch (error) {
      console.error("Auth check error:", error);
      setIsAdmin(false);
    }
  }, []);

  // Login as admin
  const login = async (password: string): Promise<boolean> => {
    try {
      const response = await apiRequest('POST', '/api/auth/login', { password });
      const data = await response.json();
      
      setIsAdmin(data.success);
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
