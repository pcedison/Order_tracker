import { useState, useEffect } from "react";
import OrderForm from "@/components/OrderForm";
import OrdersList from "@/components/OrdersList";
import AdminSection from "@/components/AdminSection";
import AdminLogin from "@/components/AdminLogin";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/hooks/useAdmin";

export default function HomePage() {
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    message: "",
    onConfirm: () => {},
  });
  
  // 使用單一狀態來源 - isAdmin 作為唯一權限依據
  const { toast } = useToast();
  const { isAdmin, checkAdminStatus } = useAdmin();
  
  // 當管理員狀態變化時，同步更新localStorage
  useEffect(() => {
    if (isAdmin) {
      console.log("Admin detected, showing panel");
      
      // 管理員狀態為真時，更新本地存儲
      localStorage.setItem('admin_login_success', 'true');
      localStorage.setItem('admin_login_timestamp', Date.now().toString());
    } else {
      console.log("No admin detected, hiding panel");
      
      // 清除本地存儲中的管理員標記
      localStorage.removeItem('admin_login_success');
      localStorage.removeItem('admin_login_timestamp');
    }
  }, [isAdmin]);
  
  // 監聽管理員相關事件，保持狀態同步
  useEffect(() => {
    // 當登入成功時刷新管理員狀態
    const handleAdminLoginSuccess = async () => {
      console.log("Admin login success event received");
      // 強制檢查並更新管理員狀態
      await checkAdminStatus(true);
    };
    
    // 當管理員狀態改變時進行處理
    const handleAdminStatusChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{isAdmin: boolean}>;
      console.log("Admin status changed:", customEvent.detail);
      
      // 事件處理不需額外設置狀態，由useAdmin hook處理
    };
    
    // 註冊事件監聽器
    window.addEventListener('adminLoginSuccess', handleAdminLoginSuccess);
    window.addEventListener('adminStatusChanged', handleAdminStatusChanged);
    
    // 初始化時檢查一次服務器狀態
    const checkInitialStatus = async () => {
      // 檢查是否有本地存儲的管理員狀態
      const storedLoginSuccess = localStorage.getItem('admin_login_success');
      
      if (storedLoginSuccess === 'true') {
        // 如果本地有狀態，進行強制驗證
        await checkAdminStatus(true);
      }
    };
    
    checkInitialStatus();
    
    // 清理事件監聽器
    return () => {
      window.removeEventListener('adminLoginSuccess', handleAdminLoginSuccess);
      window.removeEventListener('adminStatusChanged', handleAdminStatusChanged);
    };
  }, [checkAdminStatus]);

  // 顯示確認對話框
  const showConfirmDialog = (message: string, onConfirm: () => void) => {
    setConfirmConfig({
      isOpen: true,
      message,
      onConfirm,
    });
  };

  // 隱藏確認對話框
  const hideConfirmDialog = () => {
    setConfirmConfig({
      ...confirmConfig,
      isOpen: false,
    });
  };

  return (
    <div className="p-5 text-lg font-sans">
      <h1 className="text-[32px] mb-5">訂單管理系統</h1>
      
      <OrderForm />
      
      <OrdersList showConfirmDialog={showConfirmDialog} />
      
      {/* 直接使用isAdmin控制管理員區塊顯示，確保安全可靠 */}
      {isAdmin && <AdminSection isVisible={true} showConfirmDialog={showConfirmDialog} />}
      
      <AdminLogin />
      
      <ConfirmDialog 
        isOpen={confirmConfig.isOpen}
        message={confirmConfig.message}
        onConfirm={() => {
          confirmConfig.onConfirm();
          hideConfirmDialog();
        }}
        onCancel={hideConfirmDialog}
      />
    </div>
  );
}
