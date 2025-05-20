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
  
  // 用localStorage持久化管理員登錄狀態，提高可靠性
  useEffect(() => {
    // 如果本地存儲中有登入成功標記，立即設置管理員面版為可見
    const adminLoginSuccess = localStorage.getItem('admin_login_success');
    if (adminLoginSuccess === 'true') {
      setAdminPanelVisible(true);
    }
  
    const handleAdminLoginSuccess = async () => {
      console.log("Admin login success event received");
      // 立即檢查並更新管理員狀態，確保管理員面板顯示
      const status = await checkAdminStatus();
      if (status) {
        // 保存到本地存儲
        localStorage.setItem('admin_login_success', 'true'); 
        setAdminPanelVisible(true);
      }
    };
    
    const handleAdminStatusChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{isAdmin: boolean}>;
      console.log("Admin status changed:", customEvent.detail);
      if (customEvent.detail.isAdmin) {
        // 保存到本地存儲
        localStorage.setItem('admin_login_success', 'true');
        setAdminPanelVisible(true);
      } else {
        // 清除本地存儲
        localStorage.removeItem('admin_login_success');
        setAdminPanelVisible(false);
      }
    };
    
    window.addEventListener('adminLoginSuccess', handleAdminLoginSuccess);
    window.addEventListener('adminStatusChanged', handleAdminStatusChanged);
    
    // 初始化時檢查一次服務器狀態
    checkAdminStatus().then(status => {
      if (status) {
        // 保存到本地存儲
        localStorage.setItem('admin_login_success', 'true');
        setAdminPanelVisible(true);
      } else {
        // 如果服務器返回未登入，但本地有登入標記，則嘗試再次驗證
        if (adminLoginSuccess === 'true') {
          // 強制再次檢查
          setTimeout(() => {
            checkAdminStatus(true).then(secondCheck => {
              if (!secondCheck) {
                // 如果再次確認未登入，清除本地標記
                localStorage.removeItem('admin_login_success');
                setAdminPanelVisible(false);
              }
            });
          }, 500);
        }
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
      
      {/* 直接使用adminPanelVisible控制管理員區塊顯示，更加明確可靠 */}
      {adminPanelVisible && <AdminSection isVisible={true} showConfirmDialog={showConfirmDialog} />}
      
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
