import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useConfig } from "@/hooks/useConfig";
import { useAdmin } from "@/hooks/useAdmin";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ConfigFieldProps {
  label: string;
  configKey: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  disabled?: boolean;
}

function ConfigField({
  label,
  configKey,
  placeholder,
  value,
  onChange,
  onSave,
  disabled = false,
}: ConfigFieldProps) {
  return (
    <div className="mb-4">
      <label htmlFor={configKey} className="block text-lg font-medium mb-2">
        {label}:
      </label>
      <div className="flex">
        <Input
          id={configKey}
          type={configKey.includes("password") ? "password" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="text-lg p-2 border border-[#ccc] rounded flex-1 mr-2"
          disabled={disabled}
        />
        <Button
          onClick={onSave}
          className="px-4 py-2 text-lg bg-[#4CAF50] text-white border-none rounded cursor-pointer hover:bg-[#45a049]"
          disabled={disabled}
        >
          保存
        </Button>
      </div>
    </div>
  );
}

export default function ConfigSettings() {
  const { toast } = useToast();
  const { configs, isLoading, isUpdating, loadConfigs, updateConfig, updateAdminPassword } = useConfig();
  const { isAdmin, checkAdminStatus } = useAdmin();
  
  // 用於追蹤配置加載重試次數
  const configLoadRetryCount = useRef(0);
  
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseKey, setSupabaseKey] = useState("");
  const [spreadsheetApiKey, setSpreadsheetApiKey] = useState("");
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [priceSpreadsheetApiKey, setPriceSpreadsheetApiKey] = useState("");
  const [priceSpreadsheetId, setPriceSpreadsheetId] = useState("");
  
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // 当配置加载完成后，更新本地状态
  useEffect(() => {
    if (configs) {
      if (configs.SUPABASE_URL) setSupabaseUrl(configs.SUPABASE_URL);
      if (configs.SUPABASE_KEY) setSupabaseKey(configs.SUPABASE_KEY);
      if (configs.SPREADSHEET_API_KEY) setSpreadsheetApiKey(configs.SPREADSHEET_API_KEY);
      if (configs.SPREADSHEET_ID) setSpreadsheetId(configs.SPREADSHEET_ID);
      if (configs.PRICE_SPREADSHEET_API_KEY) setPriceSpreadsheetApiKey(configs.PRICE_SPREADSHEET_API_KEY);
      if (configs.PRICE_SPREADSHEET_ID) setPriceSpreadsheetId(configs.PRICE_SPREADSHEET_ID);
    }
  }, [configs]);
  
  // 增強配置加載邏輯，添加重試機制和管理員會話檢查
  useEffect(() => {
    const loadConfigsWithRetry = async () => {
      // 第一个参数 false 表示不显示错误提示
      await loadConfigs(false);
      
      // 先檢查管理員狀態，確保會話有效
      const adminStatus = await checkAdminStatus(false);
      
      // 如果當前是管理員但看不到配置數據，僅嘗試一次重新加載
      if (adminStatus && (!configs || Object.keys(configs).length === 0)) {
        if (configLoadRetryCount.current === 0) {
          configLoadRetryCount.current += 1;
          
          // 延遲500ms重新加載一次，之後不再嘗試
          setTimeout(() => {
            loadConfigs(true); // 如果這次還不成功，就顯示錯誤
          }, 500);
        }
      }
    };
    
    loadConfigsWithRetry();
    
    // 監聽管理員狀態變化，當狀態變為 true 時重新加載配置
    const handleAdminStatusChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{isAdmin: boolean}>;
      if (customEvent.detail.isAdmin) {
        // 重置重試計數器
        configLoadRetryCount.current = 0;
        // 管理員登入後，重新加載配置
        setTimeout(() => {
          loadConfigs(false);
        }, 500);
      }
    };
    
    window.addEventListener('adminStatusChanged', handleAdminStatusChanged);
    
    return () => {
      window.removeEventListener('adminStatusChanged', handleAdminStatusChanged);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // 更新管理员密码
  const handlePasswordUpdate = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: "密碼不完整",
        description: "請填寫所有密碼欄位",
        variant: "destructive",
      });
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "密碼不匹配",
        description: "新密碼與確認密碼不匹配",
        variant: "destructive",
      });
      return;
    }
    
    const success = await updateAdminPassword(currentPassword, newPassword);
    if (success) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };
  
  return (
    <Tabs defaultValue="connections" className="w-full">
      <TabsList className="grid grid-cols-2 mb-4">
        <TabsTrigger value="connections" className="text-lg py-2">外部連接設定</TabsTrigger>
        <TabsTrigger value="password" className="text-lg py-2">密碼設定</TabsTrigger>
      </TabsList>
      
      <TabsContent value="connections">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">外部連接設定</CardTitle>
            <CardDescription>
              設定 Supabase 和 Google Spreadsheet 的連接參數
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-4">正在載入配置...</div>
            ) : (
              <>
                <h3 className="text-xl font-bold mb-3">Supabase 設定</h3>
                <ConfigField
                  label="Supabase URL"
                  configKey="SUPABASE_URL"
                  placeholder="https://your-supabase-url.supabase.co"
                  value={supabaseUrl}
                  onChange={setSupabaseUrl}
                  onSave={() => updateConfig("SUPABASE_URL", supabaseUrl)}
                  disabled={isUpdating}
                />
                <ConfigField
                  label="Supabase Key"
                  configKey="SUPABASE_KEY"
                  placeholder="your-supabase-key"
                  value={supabaseKey}
                  onChange={setSupabaseKey}
                  onSave={() => updateConfig("SUPABASE_KEY", supabaseKey)}
                  disabled={isUpdating}
                />
                
                <h3 className="text-xl font-bold mt-6 mb-3">Google Spreadsheet 產品編號表設定</h3>
                <ConfigField
                  label="Spreadsheet API Key"
                  configKey="SPREADSHEET_API_KEY"
                  placeholder="your-spreadsheet-api-key"
                  value={spreadsheetApiKey ? "******" : ""}
                  onChange={setSpreadsheetApiKey}
                  onSave={() => updateConfig("SPREADSHEET_API_KEY", spreadsheetApiKey)}
                  disabled={isUpdating}
                />
                <ConfigField
                  label="Spreadsheet ID"
                  configKey="SPREADSHEET_ID"
                  placeholder="your-spreadsheet-id"
                  value={spreadsheetId ? "********" : ""}
                  onChange={setSpreadsheetId}
                  onSave={() => updateConfig("SPREADSHEET_ID", spreadsheetId)}
                  disabled={isUpdating}
                />
                
                <h3 className="text-xl font-bold mt-6 mb-3">Google Spreadsheet 產品價格表設定</h3>
                <ConfigField
                  label="價格表 API Key"
                  configKey="PRICE_SPREADSHEET_API_KEY"
                  placeholder="your-price-spreadsheet-api-key"
                  value={priceSpreadsheetApiKey ? "********" : "********"}
                  onChange={setPriceSpreadsheetApiKey}
                  onSave={() => updateConfig("PRICE_SPREADSHEET_API_KEY", priceSpreadsheetApiKey || "AIzaSyAnztgYJgF15NjENuXITpPxyR8pLHFVkQ0")}
                  disabled={isUpdating}
                />
                <ConfigField
                  label="價格表 Spreadsheet ID"
                  configKey="PRICE_SPREADSHEET_ID"
                  placeholder="your-price-spreadsheet-id"
                  value={priceSpreadsheetId ? "********" : "********"}
                  onChange={setPriceSpreadsheetId}
                  onSave={() => updateConfig("PRICE_SPREADSHEET_ID", priceSpreadsheetId || "13N3pRr3ElH2EoP6ZIUNW_Cod5o4FiG7upNnc2CD-zVI")}
                  disabled={isUpdating}
                />
                <div className="mt-4">
                  <Button
                    className="px-4 py-2 text-lg bg-[#4CAF50] text-white border-none rounded cursor-pointer hover:bg-[#45a049]"
                    onClick={() => {
                      // 同時保存兩個配置
                      updateConfig("PRICE_SPREADSHEET_API_KEY", "AIzaSyAnztgYJgF15NjENuXITpPxyR8pLHFVkQ0");
                      setTimeout(() => {
                        updateConfig("PRICE_SPREADSHEET_ID", "13N3pRr3ElH2EoP6ZIUNW_Cod5o4FiG7upNnc2CD-zVI");
                        toast({
                          title: "價格表設定已更新",
                          description: "已使用預設值設定價格表",
                          variant: "default",
                        });
                      }, 500);
                    }}
                    disabled={isUpdating}
                  >
                    使用預設值
                  </Button>
                </div>
              </>
            )}
          </CardContent>
          <CardFooter>
            <p className="text-sm text-gray-500">
              這些設定將用於連接外部服務，更改後請確保應用能夠正常連接。
            </p>
          </CardFooter>
        </Card>
      </TabsContent>
      
      <TabsContent value="password">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">管理員密碼設定</CardTitle>
            <CardDescription>
              更改管理員帳號密碼
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <label htmlFor="currentPassword" className="block text-lg font-medium mb-2">
                目前密碼:
              </label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="請輸入當前密碼"
                className="text-lg p-2 border border-[#ccc] rounded w-full"
                disabled={isUpdating}
              />
            </div>
            <div className="mb-4">
              <label htmlFor="newPassword" className="block text-lg font-medium mb-2">
                新密碼:
              </label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="請輸入新密碼"
                className="text-lg p-2 border border-[#ccc] rounded w-full"
                disabled={isUpdating}
              />
            </div>
            <div className="mb-4">
              <label htmlFor="confirmPassword" className="block text-lg font-medium mb-2">
                確認新密碼:
              </label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="請再次輸入新密碼"
                className="text-lg p-2 border border-[#ccc] rounded w-full"
                disabled={isUpdating}
              />
            </div>
            <Button
              className="px-4 py-2 text-lg bg-[#4CAF50] text-white border-none rounded cursor-pointer hover:bg-[#45a049] w-full mt-4"
              onClick={handlePasswordUpdate}
              disabled={isUpdating}
            >
              更新密碼
            </Button>
          </CardContent>
          <CardFooter>
            <p className="text-sm text-gray-500">
              請確保使用安全的密碼並妥善保管。密碼更改後將需要使用新密碼登入。
            </p>
          </CardFooter>
        </Card>
      </TabsContent>
    </Tabs>
  );
}