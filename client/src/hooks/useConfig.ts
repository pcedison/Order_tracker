import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ConfigState {
  SUPABASE_URL: string;
  SUPABASE_KEY: string;
  SPREADSHEET_API_KEY: string;
  SPREADSHEET_ID: string;
}

export function useConfig() {
  const [configs, setConfigs] = useState<Record<string, string | null>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  // 加载配置信息
  const loadConfigs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/configs');
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setConfigs(data);
    } catch (error) {
      console.error("Error loading configs:", error);
      toast({
        title: "載入配置失敗",
        description: error instanceof Error ? error.message : "未知錯誤",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 更新单个配置
  const updateConfig = async (key: string, value: string) => {
    setIsUpdating(true);
    try {
      const response = await apiRequest('POST', '/api/configs', { key, value });
      
      if (!response.ok) {
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
    setIsUpdating(true);
    try {
      const response = await apiRequest('POST', '/api/admin/password', { 
        currentPassword, 
        newPassword 
      });
      
      if (!response.ok) {
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