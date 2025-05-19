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

  // 加载配置信息 - 不触发错误提示
  const loadConfigs = async (showErrors = false) => {
    // 如果已经在加载中，不重复加载
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      // 添加缓存控制头部，避免使用缓存
      const response = await fetch('/api/configs', {
        cache: 'no-cache',
        headers: {
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache'
        }
      });
      
      // 即使返回403，也不再触发会话过期，因为我们已经修改了服务器以允许非管理员用户访问
      if (!response.ok && response.status !== 403) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setConfigs(data);
    } catch (error) {
      console.error("Error loading configs:", error);
      // 仅当用户请求显示错误时才显示错误提示
      if (showErrors && error instanceof Error && error.message.includes('Error')) {
        toast({
          title: "載入配置失敗",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
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