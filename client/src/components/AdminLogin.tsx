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

  // 重寫登入處理函數，使其更加強大和可靠
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
      console.log("嘗試登入...");
      
      // 顯示登入中提示
      toast({
        title: "登入中",
        description: "正在驗證密碼...",
      });
      
      // 執行登入操作
      const success = await login(password);
      
      // 處理登入結果
      if (success) {
        console.log("登入成功!");
        handleCloseLoginPanel();
        
        // 顯示成功提示，延長時間以便用戶看到
        toast({
          title: "登入成功",
          description: "已切換至管理員模式",
          duration: 5000
        });
        
        // 觸發多個事件以確保系統各部分都能收到通知
        // 1. 廣播登錄成功消息
        const adminLoginEvent = new CustomEvent('adminLoginSuccess');
        window.dispatchEvent(adminLoginEvent);
        
        // 2. 強制重新驗證管理員狀態
        setTimeout(() => {
          window.location.reload(); // 最可靠的方法，強制頁面重載確保狀態同步
        }, 500);
      } else {
        console.error("登入失敗，收到服務器響應但未成功認證");
        toast({
          title: "登入失敗",
          description: "密碼錯誤或認證過程失敗",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("登入過程發生錯誤:", error);
      toast({
        title: "登入失敗",
        description: error instanceof Error ? error.message : "認證過程中發生未知錯誤",
        variant: "destructive",
        duration: 5000
      });
    }
  };

  // 增強登出處理函數，確保更高的可靠性
  const handleLogout = async () => {
    try {
      console.log("準備登出管理員...");
      
      // 顯示登出中提示
      toast({
        title: "登出中",
        description: "正在清除會話...",
      });
      
      // 執行登出操作
      const success = await logout();
      
      // 處理登出結果
      if (success) {
        console.log("登出操作成功完成");
        
        // 顯示成功提示
        toast({
          title: "登出成功",
          description: "已退出管理員模式",
          duration: 3000
        });
        
        // 強制重新驗證管理員狀態，最可靠的方法是強制頁面重載
        setTimeout(() => {
          console.log("正在重新載入頁面以確保狀態同步...");
          window.location.reload();
        }, 300);
      } else {
        console.warn("登出過程可能未完全成功");
        
        // 顯示警告但假裝成功（無論如何都應該登出）
        toast({
          title: "已退出管理員模式",
          description: "登出過程可能不完整，建議刷新頁面",
          duration: 5000
        });
        
        // 強制重載頁面以確保登出狀態
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (error) {
      console.error("登出過程發生錯誤:", error);
      
      // 顯示錯誤但仍然重新載入頁面
      toast({
        title: "登出過程中出現錯誤",
        description: "將重新載入頁面以恢復正常狀態",
        variant: "destructive",
        duration: 3000
      });
      
      // 強制重載頁面以確保清除任何殘留狀態
      setTimeout(() => {
        window.location.reload();
      }, 1000);
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
