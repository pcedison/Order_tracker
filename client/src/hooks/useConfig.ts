import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ConfigState {
  SUPABASE_URL: string;
  SUPABASE_KEY: string;
  SPREADSHEET_API_KEY: string;
  SPREADSHEET_ID: string;
  PRICE_SPREADSHEET_API_KEY: string;
  PRICE_SPREADSHEET_ID: string;
}

export function useConfig() {
  const [configs, setConfigs] = useState<Record<string, string | null>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  // 改進配置載入功能，添加錯誤處理和重試機制
  const loadConfigs = async (showErrors = false) => {
    // 如果已經在載入中，避免重複請求
    if (isLoading) return;
    
    setIsLoading(true);
    
    // 重試機制
    let retryCount = 0;
    const maxRetries = 2;
    
    while (retryCount <= maxRetries) {
      try {
        // 添加緩存控制標頭，避免使用緩存
        const response = await fetch('/api/configs', {
          cache: 'no-cache',
          headers: {
            'Pragma': 'no-cache',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          },
          // 增加超時處理
          signal: AbortSignal.timeout(3000) // 3秒超時
        });
        
        // 檢查回應狀態
        if (!response.ok && response.status !== 403) {
          throw new Error(`伺服器回應錯誤: ${response.status}`);
        }
        
        // 解析數據
        const data = await response.json();
        setConfigs(data);
        
        // 成功載入，跳出循環
        break;
      } catch (error) {
        // 增加重試計數
        retryCount++;
        
        // 記錄錯誤，但不顯示在UI上
        if (retryCount > maxRetries) {
          console.error("配置載入最終失敗:", error);
          // 僅當使用者請求顯示錯誤時才顯示錯誤提示
          if (showErrors) {
            toast({
              title: "載入配置失敗",
              description: "請檢查網絡連接或稍後再試",
              variant: "destructive",
            });
          }
        } else {
          console.log(`配置載入失敗，正在重試 (${retryCount}/${maxRetries})...`);
          // 短暫延遲後重試
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }
    
    // 完成載入
    setIsLoading(false);
  };

  // 更新单个配置
  const updateConfig = async (key: string, value: string) => {
    // 如果已经在更新中，不重复发送请求
    if (isUpdating) return false;
    
    setIsUpdating(true);
    try {
      const response = await apiRequest('POST', '/api/configs', { key, value });
      
      if (!response.ok) {
        // 检查是否是会话过期/未授权
        if (response.status === 403) {
          // 会话可能已过期，触发重新登录提示
          toast({
            title: "會話已過期",
            description: "請重新登入以更新配置",
            variant: "destructive",
          });
          // 触发会话过期事件
          window.dispatchEvent(new CustomEvent('sessionExpired'));
          return false;
        }
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      toast({
        title: "配置更新成功",
        description: `${key} 已成功更新`,
      });
      
      // 更新本地缓存
      setConfigs(prev => ({
        ...prev,
        [key]: key.toLowerCase().includes('password') || 
               key.toLowerCase().includes('key') || 
               key.toLowerCase().includes('secret') 
                 ? '******' 
                 : value
      }));
      
      return true;
    } catch (error) {
      console.error(`Error updating config ${key}:`, error);
      toast({
        title: "配置更新失敗",
        description: error instanceof Error ? error.message : "未知錯誤",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  // 更新管理员密码
  const updateAdminPassword = async (currentPassword: string, newPassword: string) => {
    // 如果已经在更新中，避免重复请求
    if (isUpdating) return false;
    
    setIsUpdating(true);
    try {
      const response = await apiRequest('POST', '/api/admin/password', { 
        currentPassword, 
        newPassword 
      });
      
      if (!response.ok) {
        // 检查是否是会话过期
        if (response.status === 403) {
          toast({
            title: "會話已過期",
            description: "請重新登入以更新密碼",
            variant: "destructive",
          });
          // 触发会话过期事件
          window.dispatchEvent(new CustomEvent('sessionExpired'));
          return false;
        }
        
        const errorData = await response.json();
        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
      }
      
      toast({
        title: "密碼更新成功",
        description: "管理員密碼已成功更新",
      });
      
      return true;
    } catch (error) {
      console.error("Error updating admin password:", error);
      toast({
        title: "密碼更新失敗",
        description: error instanceof Error ? error.message : "未知錯誤",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    configs,
    isLoading,
    isUpdating,
    loadConfigs,
    updateConfig,
    updateAdminPassword,
  };
}