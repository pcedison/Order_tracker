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
      // 10分鐘後自動登出
      const TIMEOUT = 10 * 60 * 1000; // 10分鐘
      
      inactivityTimerRef.current = window.setTimeout(async () => {
        console.log("管理員不活動超時，自動登出");
        await performLogout();
        toast({
          title: "自動登出",
          description: "由於無操作，系統已自動將您登出管理員模式",
          variant: "default",
        });
      }, TIMEOUT);
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

  // 完全重構的管理員狀態檢查函數 - 簡化邏輯，提高可靠性
  const checkAdminStatus = useCallback(async (forceCheck: boolean = false) => {
    // 取得當前時間
    const now = Date.now();
    
    // 從儲存中讀取上次檢查時間
    const lastGlobalCheck = parseInt(sessionStorage.getItem('admin_last_check') || '0', 10);
    
    // 如果不是強制檢查且時間間隔小於2秒，則跳過檢查
    const MIN_CHECK_INTERVAL = 2000; // 2秒
    if (!forceCheck && now - lastGlobalCheck < MIN_CHECK_INTERVAL) {
      console.log("跳過管理員狀態檢查 (節流控制)");
      return isAdmin;
    }
    
    // 更新檢查時間
    setLastCheck(now);
    sessionStorage.setItem('admin_last_check', now.toString());
    console.log("執行管理員狀態檢查...");
    
    try {
      // 使用標準fetch請求而不使用AbortController，避免長時間執行後的警告
      const response = await fetch('/api/auth/status', {
        method: 'GET',
        credentials: 'include',
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
        console.log("管理員狀態檢查結果:", data);
        
        // 無論是否變化都更新狀態並觸發事件
        setIsAdmin(data.authenticated);
        window.dispatchEvent(new CustomEvent('adminStatusChanged', { 
          detail: { isAdmin: data.authenticated } 
        }));
        
        // 設置剩餘時間
        if (data.authenticated && data.remainingTimeSeconds !== undefined) {
          // 只有在時間顯著變化時才更新狀態以減少渲染
          if (Math.abs((remainingTime || 0) - data.remainingTimeSeconds) > 30) {
            setRemainingTime(data.remainingTimeSeconds);
          }
          
          // 只在剩餘1分鐘且未顯示警告時顯示警告
          if (data.remainingTimeSeconds < 60 && !timeoutWarningShown.current) {
            timeoutWarningShown.current = true;
            
            toast({
              title: "會話即將過期",
              description: `您的管理員會話將在不到1分鐘後過期，請繼續操作以保持會話活動`,
              variant: "destructive",
            });
          }
        } else if (remainingTime !== null) {
          setRemainingTime(null);
        }
        
        // 在檢查成功時，重置錯誤計數
        if (data.authenticated && checkCount > 0) {
          setCheckCount(0);
        }
        
        return data.authenticated;
      } else {
        if (isAdmin && forceCheck) {
          toast({
            title: "管理員狀態檢查失敗",
            description: "您的管理員會話可能已過期，請重新登入",
            variant: "destructive",
          });
        }
        
        if (isAdmin) {
          setIsAdmin(false);
          setRemainingTime(null);
          
          // 觸發全局事件通知登出情況
          window.dispatchEvent(new CustomEvent('adminStatusChanged', { 
            detail: { isAdmin: false } 
          }));
        }
        
        return false;
      }
    } catch (error) {
      // 網絡錯誤處理
      console.error("Auth check error:", error);
      
      // 只有在以前是管理員時才顯示錯誤
      if (isAdmin && forceCheck) {
        toast({
          title: "管理員會話檢查失敗",
          description: "發生網絡錯誤，可能需要重新登入",
          variant: "destructive",
        });
      }
      
      // 增加錯誤計數
      setCheckCount(prev => prev + 1);
      
      // 如果連續多次檢查失敗，重置狀態
      if (checkCount > 3) {
        setIsAdmin(false);
        setRemainingTime(null);
      }
      
      // 在錯誤情況下返回當前狀態，避免不必要的UI更新
      return isAdmin;
    }
  }, [isAdmin, checkCount, lastCheck, toast, remainingTime]);
  
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
      console.log("Admin status changed:", customEvent.detail);
      console.log("Admin status changed:", customEvent.detail.isAdmin);
    };
    
    // 設置事件監聽器
    console.log("Setting up event listeners (once)");
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

  // 完全重構的密碼驗證功能
  const login = async (password: string): Promise<boolean> => {
    try {
      console.log("嘗試登入...");
      
      // 清除任何現有的會話cookie
      document.cookie = 'admin.sid=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      
      // 使用直接的fetch請求而非中間層，避免潛在的緩存問題
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
        const data = await response.json();
        console.error("登入請求失敗:", response.status, data);
        return false;
      }
      
      const data = await response.json();
      console.log("登入響應:", data);
      
      if (data.success) {
        console.log("登入成功!");
        console.log("開始管理員登錄...");
        console.log("登錄成功，已獲得會話ID:", data.sessionId);
        
        // 立即更新狀態
        setIsAdmin(true);
        
        // 驗證會話是否成功設置
        const verifySession = async (): Promise<boolean> => {
          // 等待服務器處理會話
          await new Promise(resolve => setTimeout(resolve, 700));
          
          try {
            // 驗證會話
            const statusRes = await fetch('/api/auth/status', {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
              },
              credentials: 'include',
              cache: 'no-store'
            });
            
            if (!statusRes.ok) {
              console.error("會話驗證請求失敗:", statusRes.status);
              return false;
            }
            
            const statusData = await statusRes.json();
            console.log("第一次會話驗證結果:", statusData);
            
            // 確認會話已驗證
            return statusData.authenticated === true;
          } catch (error) {
            console.error("會話驗證過程中出錯:", error);
            return false;
          }
        };
        
        // 執行會話驗證
        const verified = await verifySession();
        
        if (verified) {
          console.log("會話驗證成功，管理員身份已確認");
        } else {
          console.warn("會話驗證失敗，但仍將嘗試繼續");
        }
        
        // 更新應用程式狀態
        window.dispatchEvent(new CustomEvent('adminLoginSuccess'));
        window.dispatchEvent(new CustomEvent('adminStatusChanged', { 
          detail: { isAdmin: true } 
        }));
        
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
      console.log("準備登出管理員...");
      
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
      
      console.log("登出操作成功完成");
      
      // 在重定向前確認會話已清除
      setTimeout(() => {
        console.log("正在重新載入頁面以確保狀態同步...");
        window.location.reload();
      }, 300);
      
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