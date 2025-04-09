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
  
  const { toast } = useToast();
  const { isAdmin, checkAdminStatus } = useAdmin();
  
  // 监听管理员登录成功事件，以更新管理员面板显示
  useEffect(() => {
    const handleAdminLoginSuccess = () => {
      // 立即检查并更新管理员状态，确保管理员面板显示
      checkAdminStatus();
    };
    
    window.addEventListener('adminLoginSuccess', handleAdminLoginSuccess);
    
    return () => {
      window.removeEventListener('adminLoginSuccess', handleAdminLoginSuccess);
    };
  }, [checkAdminStatus]);

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
      
      <AdminSection isVisible={isAdmin} showConfirmDialog={showConfirmDialog} />
      
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
