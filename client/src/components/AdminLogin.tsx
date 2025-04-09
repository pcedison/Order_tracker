import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/hooks/useAdmin";

export default function AdminLogin() {
  const [isLoginPanelOpen, setIsLoginPanelOpen] = useState(false);
  const [password, setPassword] = useState("");
  
  const { toast } = useToast();
  const { isAdmin, login, logout } = useAdmin();

  const handleOpenLoginPanel = () => {
    setIsLoginPanelOpen(true);
    setPassword("");
  };

  const handleCloseLoginPanel = () => {
    setIsLoginPanelOpen(false);
  };

  const handleLogin = async () => {
    if (!password) {
      toast({
        title: "請輸入密碼",
        description: "密碼不能為空",
        variant: "destructive",
      });
      return;
    }

    try {
      const success = await login(password);
      if (success) {
        handleCloseLoginPanel();
        toast({
          title: "登入成功",
          description: "已切換至管理員模式",
        });
        
        // 延迟一段时间后刷新页面，确保能显示管理员面板
        // 这里使用自定义事件广播登录成功的消息
        const adminLoginEvent = new CustomEvent('adminLoginSuccess');
        window.dispatchEvent(adminLoginEvent);
      } else {
        toast({
          title: "登入失敗",
          description: "密碼錯誤",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "登入失敗",
        description: error instanceof Error ? error.message : "未知錯誤",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "登出成功",
        description: "已退出管理員模式",
      });
    } catch (error) {
      toast({
        title: "登出失敗",
        description: error instanceof Error ? error.message : "未知錯誤",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      {/* Admin Login/Logout Links */}
      {!isAdmin ? (
        <div 
          className="text-right mt-5 text-base text-gray-600 cursor-pointer" 
          id="adminLink"
          onClick={handleOpenLoginPanel}
        >
          管理員登入
        </div>
      ) : (
        <div 
          className="text-right mt-1 font-bold text-[#d32f2f] cursor-pointer" 
          id="logoutLink"
          onClick={handleLogout}
        >
          登出管理員
        </div>
      )}
      
      {/* Login Panel */}
      {isLoginPanelOpen && (
        <div 
          className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 z-[1000] flex items-center justify-center" 
          id="loginPanel"
        >
          <div className="bg-white p-5 rounded-lg w-[300px]">
            <div className="text-[24px] mb-4">管理員登入</div>
            <div className="mb-4">
              <label htmlFor="adminPassword" className="inline-block w-32 text-[22px]">密碼：</label>
              <Input
                type="password"
                id="adminPassword"
                placeholder="請輸入密碼"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="p-2 text-[22px] border border-[#ccc] rounded w-full"
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>
            <Button
              id="loginBtn"
              onClick={handleLogin}
              className="px-4 py-2.5 text-[22px] bg-[#4CAF50] text-white border-none rounded cursor-pointer mr-2.5 hover:bg-[#45a049]"
            >
              登入
            </Button>
            <Button
              className="px-4 py-2.5 text-[22px] bg-[#f44336] text-white border-none rounded cursor-pointer hover:bg-[#d32f2f]"
              id="cancelLoginBtn"
              onClick={handleCloseLoginPanel}
            >
              取消
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
