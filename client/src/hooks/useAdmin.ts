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
    
    // 增加節流控制：非強制檢查時使用更長間隔，減少過多請求
    const MIN_CHECK_INTERVAL = forceCheck ? 2000 : 30000; // 強制檢查2秒，普通檢查30秒
    if (now - lastGlobalCheck < MIN_CHECK_INTERVAL) {
      if (now - lastGlobalCheck < 10000) { // 僅在10秒內輸出日誌，避免過多日誌
        console.log("跳過管理員狀態檢查 (節流控制)");
      }
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
  
  // 在鉤子初始化時自動檢查管理員狀態，強制重新驗證
  useEffect(() => {
    const initializeAdminStatus = async () => {
      console.log("初始化管理員狀態檢查...");
      
      // 先判斷localStorage中是否有登入標記
      const loginSuccess = localStorage.getItem('admin_login_success');
      const loginTimestamp = localStorage.getItem('admin_login_timestamp');
      
      // 如果有登入標記，檢查是否過期（10分鐘有效期）
      if (loginSuccess === 'true' && loginTimestamp) {
        const timestamp = parseInt(loginTimestamp, 10);
        const now = Date.now();
        const SESSION_EXPIRY = 10 * 60 * 1000; // 10分鐘
        
        if (now - timestamp < SESSION_EXPIRY) {
          // 登入標記有效，強制驗證服務器狀態
          console.log("發現有效的登入標記，立即驗證服務器狀態");
          await checkAdminStatus(true);
        } else {
          // 登入標記已過期，清除
          console.log("發現過期的登入標記，清除");
          localStorage.removeItem('admin_login_success');
          localStorage.removeItem('admin_login_timestamp');
          setIsAdmin(false);
        }
      } else {
        // 沒有登入標記，正常檢查一次
        await checkAdminStatus(false);
      }
    };
    
    // 啟動初始化
    initializeAdminStatus();
    
    // 添加會話過期的監聽器
    const handleSessionExpired = () => {
      console.log("Session expired event received");
      setIsAdmin(false);
      localStorage.removeItem('admin_login_success');
      localStorage.removeItem('admin_login_timestamp');
      
      toast({
        title: "管理員會話已過期",
        description: "請重新登入以繼續操作",
        variant: "destructive",
      });
    };
    
    // 添加管理員狀態變更的監聽器（更完善的處理）
    const handleAdminStatusChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{isAdmin: boolean}>;
      console.log("Admin status changed:", customEvent.detail);
      
      // 實際應用狀態變更，確保同步
      if (customEvent.detail.isAdmin !== isAdmin) {
        console.log(`管理員狀態從 ${isAdmin} 變更為 ${customEvent.detail.isAdmin}`);
        setIsAdmin(customEvent.detail.isAdmin);
        
        // 更新本地存儲
        if (customEvent.detail.isAdmin) {
          localStorage.setItem('admin_login_success', 'true');
          localStorage.setItem('admin_login_timestamp', Date.now().toString());
        } else {
          localStorage.removeItem('admin_login_success');
          localStorage.removeItem('admin_login_timestamp');
        }
      }
    };
    
    // 設置事件監聽器
    console.log("Setting up event listeners (once)");
    window.addEventListener('sessionExpired', handleSessionExpired);
    window.addEventListener('adminStatusChanged', handleAdminStatusChanged);
    
    // 定期檢查管理員狀態，確保長時間活動時狀態保持一致
    // 改為每2分鐘檢查一次，提高會話過期檢測的頻率
    const intervalId = setInterval(() => {
      checkAdminStatus(true);
    }, 2 * 60 * 1000); 
    
    return () => {
      window.removeEventListener('sessionExpired', handleSessionExpired);
      window.removeEventListener('adminStatusChanged', handleAdminStatusChanged);
      clearInterval(intervalId);
    };
  }, [checkAdminStatus, toast, isAdmin]);

  // 完全重構的密碼驗證功能
  const login = async (password: string): Promise<boolean> => {
    try {
      console.log("嘗試登入...");
      
      // 不再預先登出，避免會話混亂
      // 只清除本地登入標記，讓服務器決定是否允許新的登入
      localStorage.removeItem('admin_login_success');
      localStorage.removeItem('admin_login_timestamp');
      
      // 清除以下的會話數據，確保登入之前沒有過時的會話信息
      document.cookie = 'admin.sid=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      sessionStorage.removeItem('admin_last_check');
      
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
        const errorData = await response.json().catch(() => ({ message: "響應解析失敗" }));
        console.error("登入請求失敗:", response.status, errorData);
        // 確保本地狀態同步
        setIsAdmin(false);
        return false;
      }
      
      const data = await response.json();
      console.log("登入響應:", data);
      
      if (data.success) {
        console.log("登入成功!");
        console.log("開始管理員登錄...");
        console.log("登錄成功，已獲得會話ID:", data.sessionId);
        
        // 驗證會話是否成功設置，確保本地狀態與服務器一致
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
            
            // 確認會話已驗證，這是決定本地狀態的唯一標準
            if (statusData.authenticated === true) {
              // 立即更新狀態
              setIsAdmin(true);
              return true;
            } else {
              // 確保狀態同步
              setIsAdmin(false);
              return false;
            }
          } catch (error) {
            console.error("會話驗證過程中出錯:", error);
            setIsAdmin(false);
            return false;
          }
        };
        
        // 執行會話驗證
        const verified = await verifySession();
        
        if (verified) {
          console.log("會話驗證成功，管理員身份已確認");
          
          // 更新應用程式狀態
          window.dispatchEvent(new CustomEvent('adminLoginSuccess'));
          window.dispatchEvent(new CustomEvent('adminStatusChanged', { 
            detail: { isAdmin: true } 
          }));
          
          return true;
        } else {
          console.warn("會話驗證失敗，無法繼續使用管理員功能");
          setIsAdmin(false);
          return false;
        }
      } else {
        console.error("服務器拒絕登錄請求:", data.message || "未提供原因");
        setIsAdmin(false);
        return false;
      }
    } catch (error) {
      console.error("登錄過程發生錯誤:", error);
      setIsAdmin(false);
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
      
      // 移除強制重新載入頁面的代碼，避免登入後立即觸發登出流程
      // 改為僅清除localStorage中的登入標記
      localStorage.removeItem('admin_login_success');
      localStorage.removeItem('admin_login_timestamp');
      
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