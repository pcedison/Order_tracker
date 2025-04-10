import { useState, useCallback, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export function useAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkCount, setCheckCount] = useState(0);
  const [lastCheck, setLastCheck] = useState(0);
  const { toast } = useToast();

  // Check if user is already authenticated as admin
  const checkAdminStatus = useCallback(async (showErrors = false) => {
    // 防止频繁重复检查
    const now = Date.now();
    if (now - lastCheck < 1000) { // 至少间隔1秒
      return isAdmin;
    }
    
    setLastCheck(now);
    
    try {
      const response = await fetch('/api/auth/status', {
        credentials: 'include', // Include cookies for session-based auth
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setIsAdmin(data.authenticated);
        if (data.authenticated) {
          // 重置错误计数
          setCheckCount(0);
        }
        return data.authenticated;
      } else {
        if (isAdmin && showErrors) {
          toast({
            title: "管理員狀態檢查失敗",
            description: "您的管理員會話可能已過期，請重新登入",
            variant: "destructive",
          });
        }
        setIsAdmin(false);
        return false;
      }
    } catch (error) {
      console.error("Auth check error:", error);
      
      // 如果之前是管理员状态，显示错误提示
      if (isAdmin && showErrors) {
        toast({
          title: "管理員會話檢查失敗",
          description: "發生網絡錯誤，可能需要重新登入",
          variant: "destructive",
        });
      }
      
      // 增加错误计数
      setCheckCount(prev => prev + 1);
      
      // 如果连续多次检查失败，可能需要重置状态
      if (checkCount > 3) {
        setIsAdmin(false);
      }
      
      return false;
    }
  }, [isAdmin, checkCount, lastCheck, toast]);
  
  // 在钩子初始化时自动检查管理员状态，并监听会话过期事件
  useEffect(() => {
    // 初始化立即检查一次
    checkAdminStatus();
    
    // 添加会话过期的监听器
    const handleSessionExpired = () => {
      console.log("Session expired event received");
      setIsAdmin(false);
      toast({
        title: "管理員會話已過期",
        description: "請重新登入以繼續操作",
        variant: "destructive",
      });
    };
    
    // 添加管理员状态变更的监听器
    const handleAdminStatusChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{isAdmin: boolean}>;
      console.log("Admin status changed:", customEvent.detail.isAdmin);
    };
    
    window.addEventListener('sessionExpired', handleSessionExpired);
    window.addEventListener('adminStatusChanged', handleAdminStatusChanged);
    
    // 定期检查管理员状态，确保长时间活动时状态保持一致
    // 改为每3分钟检查一次，提高会话过期检测的频率
    const intervalId = setInterval(() => {
      checkAdminStatus(true); // 显示错误提示
    }, 3 * 60 * 1000); 
    
    return () => {
      window.removeEventListener('sessionExpired', handleSessionExpired);
      window.removeEventListener('adminStatusChanged', handleAdminStatusChanged);
      clearInterval(intervalId);
    };
  }, [checkAdminStatus, toast]);

  // 增強的管理員登錄功能
  const login = async (password: string): Promise<boolean> => {
    try {
      const response = await apiRequest('POST', '/api/auth/login', { password });
      const data = await response.json();
      
      if (data.success) {
        setIsAdmin(true);
        
        // 嘗試進行多次會話驗證以確保會話已正確建立
        setTimeout(() => {
          // 登錄成功後1秒鐘再檢查一次會話狀態，確保會話已被正確設置
          checkAdminStatus(false);
          
          // 2秒後再確認一次
          setTimeout(() => {
            checkAdminStatus(false);
          }, 1000);
        }, 1000);
        
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
