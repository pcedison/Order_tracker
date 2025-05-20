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
  
  // 管理员状态跟踪
  const [adminPanelVisible, setAdminPanelVisible] = useState(false);
  
  const { toast } = useToast();
  const { isAdmin, checkAdminStatus } = useAdmin();
  
  // 当 isAdmin 变化时更新面板可见性
  useEffect(() => {
    if (isAdmin) {
      console.log("Admin detected, showing panel");
      setAdminPanelVisible(true);
    } else {
      console.log("No admin detected, hiding panel");
      setAdminPanelVisible(false);
    }
  }, [isAdmin]);
  
  // 监听管理员登录成功事件和状态变更事件
  useEffect(() => {
    const handleAdminLoginSuccess = async () => {
      console.log("Admin login success event received");
      // 立即检查并更新管理员状态，确保管理员面板显示
      const status = await checkAdminStatus();
      if (status) {
        setAdminPanelVisible(true);
      }
    };
    
    const handleAdminStatusChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{isAdmin: boolean}>;
      console.log("Admin status changed:", customEvent.detail);
      if (customEvent.detail.isAdmin) {
        setAdminPanelVisible(true);
      } else {
        setAdminPanelVisible(false);
      }
    };
    
    window.addEventListener('adminLoginSuccess', handleAdminLoginSuccess);
    window.addEventListener('adminStatusChanged', handleAdminStatusChanged);
    
    // 初始化时检查一次
    checkAdminStatus().then(status => {
      if (status) {
        setAdminPanelVisible(true);
      }
    });
    
    return () => {
      window.removeEventListener('adminLoginSuccess', handleAdminLoginSuccess);
      window.removeEventListener('adminStatusChanged', handleAdminStatusChanged);
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
      
      {/* 只使用isAdmin狀態控制管理員區塊顯示 */}
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
