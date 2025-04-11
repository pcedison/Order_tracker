import { useState, useCallback, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export function useAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkCount, setCheckCount] = useState(0);
  const [lastCheck, setLastCheck] = useState(0);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const timeoutWarningShown = useRef(false); // 追蹤是否已顯示超時警告
  const inactivityTimerRef = useRef<number | null>(null); // 用於追蹤不活動計時器
  const { toast } = useToast();

  // 在這裡先定義登出函數，以避免 hooks 順序問題
  const performLogout = async (): Promise<boolean> => {
    try {
      console.log("開始登出管理員...");
      
      // 使用自定義請求，不使用 apiRequest，確保完全控制
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        credentials: 'include',
        mode: 'same-origin',
        cache: 'no-store'
      });
      
      // 檢查响應狀態
      if (!response.ok) {
        const text = await response.text();
        console.error("登出請求失敗:", response.status, text);
        // 即使請求失敗，也將本地狀態設置為已登出
        setIsAdmin(false);
      } else {
        console.log("登出請求成功");
        setIsAdmin(false);
      }
      
      // 即使請求失敗，也嘗試手動清除 cookie
      document.cookie = 'admin.sid=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      
      // 觸發自定義事件，通知其他組件管理員狀態已改變
      const adminStatusEvent = new CustomEvent('adminStatusChanged', { 
        detail: { isAdmin: false } 
      });
      window.dispatchEvent(adminStatusEvent);
      
      // 確認會話已清除
      setTimeout(async () => {
        try {
          const statusCheck = await fetch('/api/auth/status', {
            method: 'GET',
            credentials: 'include',
            cache: 'no-store'
          });
          
          if (statusCheck.ok) {
            const statusData = await statusCheck.json();
            console.log("登出後會話狀態:", statusData);
          }
        } catch (e) {
          console.error("登出後狀態檢查失敗:", e);
        }
      }, 500);
      
      return true;
    } catch (error) {
      console.error("登出過程中出錯:", error);
      // 即使出錯，也強制本地狀態為已登出
      setIsAdmin(false);
      return false;
    }
  };

  // 重置不活動計時器
  const resetInactivityTimer = useCallback(() => {
    // 清除現有計時器
    if (inactivityTimerRef.current !== null) {
      window.clearTimeout(inactivityTimerRef.current);
    }

    // 如果用戶是管理員，設置一個新的計時器
    if (isAdmin) {
      // 5分鐘後自動登出
      inactivityTimerRef.current = window.setTimeout(async () => {
        console.log("管理員不活動超時，自動登出");
        await performLogout();
        toast({
          title: "自動登出",
          description: "由於5分鐘無操作，系統已自動將您登出管理員模式",
          variant: "default",
        });
      }, 5 * 60 * 1000);
    }
  }, [isAdmin, toast, performLogout]);

  // 添加用戶活動監聽
  useEffect(() => {
    if (!isAdmin) return;
    
    // 用戶活動事件列表
    const activityEvents = [
      'mousedown', 'mousemove', 'keypress', 
      'scroll', 'touchstart', 'click'
    ];
    
    // 活動事件處理函數
    const handleUserActivity = () => {
      // 重置不活動計時器
      resetInactivityTimer();
      
      // 重置警告狀態
      timeoutWarningShown.current = false;
    };
    
    // 添加所有活動事件監聽器
    activityEvents.forEach(event => {
      document.addEventListener(event, handleUserActivity);
    });
    
    // 初始化計時器
    resetInactivityTimer();
    
    // 清理函數
    return () => {
      // 移除所有活動事件監聽器
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleUserActivity);
      });
      
      // 清除計時器
      if (inactivityTimerRef.current !== null) {
        window.clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [isAdmin, resetInactivityTimer]);

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
        method: 'GET',
        credentials: 'include', // 包含 cookie 以支持基於會話的認證
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Accept': 'application/json'
        },
        cache: 'no-store'
      });
      
      if (response.ok) {
        const data = await response.json();
        setIsAdmin(data.authenticated);
        
        // 設置剩餘時間
        if (data.authenticated && data.remainingTimeSeconds !== undefined) {
          setRemainingTime(data.remainingTimeSeconds);
          
          // 如果剩餘時間小於1分鐘且尚未顯示警告，顯示超時警告
          if (data.remainingTimeSeconds < 60 && !timeoutWarningShown.current) {
            timeoutWarningShown.current = true;
            
            toast({
              title: "會話即將過期",
              description: `您的管理員會話將在不到1分鐘後過期，請繼續操作以保持會話活動`,
              variant: "destructive",
            });
          }
        } else {
          setRemainingTime(null);
        }
        
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
        setRemainingTime(null);
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
        setRemainingTime(null);
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

  // 完全重寫的管理員登錄功能
  const login = async (password: string): Promise<boolean> => {
    try {
      console.log("開始管理員登錄...");
      
      // 使用自定義請求替代 apiRequest，以確保最大控制權
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: JSON.stringify({ password }),
        credentials: 'include',
        mode: 'same-origin',
        cache: 'no-store'
      });
      
      if (!response.ok) {
        const text = await response.text();
        console.error("登錄請求失敗:", response.status, text);
        return false;
      }
      
      const data = await response.json();
      console.log("登錄響應:", data);
      
      if (data.success) {
        console.log("登錄成功，已獲得會話ID:", data.sessionId);
        // 立即存儲管理員狀態
        setIsAdmin(true);
        
        // 嘗試建立一個複雜的會話驗證過程，確保會話已正確設置
        const verifySession = async (): Promise<boolean> => {
          // 等待一小段時間，以確保會話已被服務器處理
          await new Promise(resolve => setTimeout(resolve, 500));
          
          try {
            // 進行第一次會話驗證
            const statusRes1 = await fetch('/api/auth/status', {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
              },
              credentials: 'include',
              cache: 'no-store'
            });
            
            if (!statusRes1.ok) {
              console.error("第一次會話驗證失敗:", statusRes1.status);
              return false;
            }
            
            const statusData1 = await statusRes1.json();
            console.log("第一次會話驗證結果:", statusData1);
            
            if (!statusData1.authenticated) {
              console.error("第一次驗證未確認管理員狀態");
              // 嘗試第二次驗證
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              const statusRes2 = await fetch('/api/auth/status', {
                method: 'GET',
                headers: {
                  'Accept': 'application/json',
                  'Cache-Control': 'no-cache, no-store, must-revalidate'
                },
                credentials: 'include',
                cache: 'no-store'
              });
              
              if (!statusRes2.ok) {
                console.error("第二次會話驗證失敗:", statusRes2.status);
                return false;
              }
              
              const statusData2 = await statusRes2.json();
              console.log("第二次會話驗證結果:", statusData2);
              
              if (!statusData2.authenticated) {
                console.error("兩次驗證均未確認管理員狀態");
                return false;
              }
            }
            
            return true;
          } catch (error) {
            console.error("會話驗證過程中出錯:", error);
            return false;
          }
        };
        
        // 執行會話驗證
        const verified = await verifySession();
        if (!verified) {
          console.warn("會話驗證失敗，但仍將嘗試繼續");
        } else {
          console.log("會話驗證成功，管理員身份已確認");
        }
        
        // 無論驗證結果如何，都觸發管理員狀態變更事件
        const adminStatusEvent = new CustomEvent('adminLoginSuccess', {
          detail: { isAdmin: true, sessionId: data.sessionId }
        });
        window.dispatchEvent(adminStatusEvent);
        
        // 同時觸發標準事件
        const adminStatusChangedEvent = new CustomEvent('adminStatusChanged', { 
          detail: { isAdmin: true } 
        });
        window.dispatchEvent(adminStatusChangedEvent);
        
        return true;
      } else {
        console.error("服務器拒絕登錄請求:", data.message || "未提供原因");
        return false;
      }
    } catch (error) {
      console.error("登錄過程發生錯誤:", error);
      return false;
    }
  };

  // 完全重新設計的登出功能
  const logout = async (): Promise<boolean> => {
    try {
      console.log("開始登出管理員...");
      
      // 使用自定義請求，不使用 apiRequest，確保完全控制
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        credentials: 'include',
        mode: 'same-origin',
        cache: 'no-store'
      });
      
      // 檢查响應狀態
      if (!response.ok) {
        const text = await response.text();
        console.error("登出請求失敗:", response.status, text);
        // 即使請求失敗，也將本地狀態設置為已登出
        setIsAdmin(false);
      } else {
        console.log("登出請求成功");
        setIsAdmin(false);
      }
      
      // 即使請求失敗，也嘗試手動清除 cookie
      document.cookie = 'admin.sid=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      
      // 觸發自定義事件，通知其他組件管理員狀態已改變
      const adminStatusEvent = new CustomEvent('adminStatusChanged', { 
        detail: { isAdmin: false } 
      });
      window.dispatchEvent(adminStatusEvent);
      
      // 確認會話已清除
      setTimeout(async () => {
        try {
          const statusCheck = await fetch('/api/auth/status', {
            method: 'GET',
            credentials: 'include',
            cache: 'no-store'
          });
          
          if (statusCheck.ok) {
            const statusData = await statusCheck.json();
            console.log("登出後會話狀態:", statusData);
          }
        } catch (e) {
          console.error("登出後狀態檢查失敗:", e);
        }
      }, 500);
      
      return true;
    } catch (error) {
      console.error("登出過程中出錯:", error);
      // 即使出錯，也強制本地狀態為已登出
      setIsAdmin(false);
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
