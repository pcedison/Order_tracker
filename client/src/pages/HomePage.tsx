import { useState, useEffect } from "react";
import OrderForm from "@/components/OrderForm";
import OrdersList from "@/components/OrdersList";
import AdminSection from "@/components/AdminSection";
import AdminLogin from "@/components/AdminLogin";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/context/AdminContext";

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
  
  const { toast } = useToast();
  const { isAdmin, checkAdminStatus } = useAdmin();
  
  // 管理員狀態處理 - 同步更新localStorage
  useEffect(() => {
    if (isAdmin) {
      console.log("Admin detected, showing panel");
      localStorage.setItem('admin_login_success', 'true');
      localStorage.setItem('admin_login_timestamp', Date.now().toString());
    } else {
      console.log("No admin detected, hiding panel");
      localStorage.removeItem('admin_login_success');
      localStorage.removeItem('admin_login_timestamp');
    }
  }, [isAdmin]);
  
  // 事件監聽設置
  useEffect(() => {
    // 登入成功事件處理
    const handleAdminLoginSuccess = async () => {
      console.log("Admin login success event received");
      // 僅觸發狀態檢查，不直接設置UI狀態
      await checkAdminStatus(true);
    };
    
    // 狀態變更事件處理
    const handleAdminStatusChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{isAdmin: boolean}>;
      console.log("Admin status changed:", customEvent.detail);
      // 不需要操作，由useAdmin Hook自動處理
    };
    
    // 註冊事件監聽器
    window.addEventListener('adminLoginSuccess', handleAdminLoginSuccess);
    window.addEventListener('adminStatusChanged', handleAdminStatusChanged);
    
    // 初始化檢查 - 從localStorage恢復狀態
    const checkInitialStatus = async () => {
      const storedLoginSuccess = localStorage.getItem('admin_login_success');
      if (storedLoginSuccess === 'true') {
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

  // 對話框處理函數
  const showConfirmDialog = (message: string, onConfirm: () => void) => {
    setConfirmConfig({
      isOpen: true,
      message,
      onConfirm,
    });
  };

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
      
      {/* 直接使用isAdmin控制管理員區塊顯示 */}
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
