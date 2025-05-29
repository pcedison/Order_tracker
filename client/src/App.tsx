import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/HomePage";
import Navigation from "@/components/Navigation";
import OrderForm from "@/components/OrderForm";
import OrdersList from "@/components/OrdersList";
import AdminSection from "@/components/AdminSection";
import ConfigSettings from "@/components/ConfigSettings";
import ConfirmDialog from "@/components/ConfirmDialog";

function Router() {
  const [location] = useLocation();
  const [currentView, setCurrentView] = useState('orders');
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    message: '',
    onConfirm: () => {}
  });

  // 根據路由設置當前視圖
  useEffect(() => {
    if (location === '/') setCurrentView('orders');
    else if (location === '/orders') setCurrentView('list');
    else if (location === '/dashboard') setCurrentView('dashboard');
    else if (location === '/admin') setCurrentView('admin');
    else if (location === '/config') setCurrentView('config');
  }, [location]);

  const showConfirmDialog = (message: string, onConfirm: () => void) => {
    setConfirmDialog({
      isOpen: true,
      message,
      onConfirm
    });
  };

  const handleConfirmDialogClose = () => {
    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
  };

  const handleConfirmDialogConfirm = () => {
    confirmDialog.onConfirm();
    handleConfirmDialogClose();
  };

  return (
    <div className="min-h-screen">
      <Navigation currentView={currentView} onViewChange={setCurrentView} />
      
      {/* 主要內容區 */}
      <main className="pt-20 pb-10 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-fade-in">
            {/* 新增訂單視圖 */}
            {currentView === 'orders' && (
              <div className="max-w-3xl mx-auto">
                <div className="glass-morphism rounded-2xl shadow-2xl overflow-hidden">
                  <div className="gradient-primary p-6 text-white">
                    <h2 className="text-2xl font-bold flex items-center">
                      <i className="fas fa-file-invoice mr-3"></i>
                      建立新訂單
                    </h2>
                    <p className="mt-2 text-purple-100">請填寫以下資訊來建立新的產品訂單</p>
                  </div>
                  <div className="p-8">
                    <OrderForm />
                  </div>
                </div>
              </div>
            )}

            {/* 訂單列表視圖 */}
            {currentView === 'list' && (
              <OrdersList showConfirmDialog={showConfirmDialog} />
            )}

            {/* 數據分析視圖 */}
            {currentView === 'dashboard' && (
              <HomePage />
            )}

            {/* 管理員區域 */}
            {currentView === 'admin' && (
              <AdminSection 
                isVisible={true} 
                showConfirmDialog={showConfirmDialog} 
              />
            )}

            {/* 系統配置 */}
            {currentView === 'config' && (
              <div className="max-w-4xl mx-auto">
                <div className="glass-morphism rounded-2xl shadow-2xl overflow-hidden">
                  <div className="gradient-primary p-6 text-white">
                    <h2 className="text-2xl font-bold flex items-center">
                      <i className="fas fa-cog mr-3"></i>
                      系統配置
                    </h2>
                    <p className="mt-2 text-purple-100">管理系統設定和外部服務連接</p>
                  </div>
                  <div className="p-8">
                    <ConfigSettings />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 確認對話框 */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        message={confirmDialog.message}
        onConfirm={handleConfirmDialogConfirm}
        onCancel={handleConfirmDialogClose}
      />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
