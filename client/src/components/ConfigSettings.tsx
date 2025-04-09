import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useConfig } from "@/hooks/useConfig";
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
  
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseKey, setSupabaseKey] = useState("");
  const [spreadsheetApiKey, setSpreadsheetApiKey] = useState("");
  const [spreadsheetId, setSpreadsheetId] = useState("");
  
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // 加载配置
  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);
  
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
                
                <h3 className="text-xl font-bold mt-6 mb-3">Google Spreadsheet 設定</h3>
                <ConfigField
                  label="Spreadsheet API Key"
                  configKey="SPREADSHEET_API_KEY"
                  placeholder="your-spreadsheet-api-key"
                  value={spreadsheetApiKey}
                  onChange={setSpreadsheetApiKey}
                  onSave={() => updateConfig("SPREADSHEET_API_KEY", spreadsheetApiKey)}
                  disabled={isUpdating}
                />
                <ConfigField
                  label="Spreadsheet ID"
                  configKey="SPREADSHEET_ID"
                  placeholder="your-spreadsheet-id"
                  value={spreadsheetId}
                  onChange={setSpreadsheetId}
                  onSave={() => updateConfig("SPREADSHEET_ID", spreadsheetId)}
                  disabled={isUpdating}
                />
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