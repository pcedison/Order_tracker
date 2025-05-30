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
import HistoryOrders from "@/components/HistoryOrders";
import AdminSection from "@/components/AdminSection";
import ConfigSettings from "@/components/ConfigSettings";
import ConfirmDialog from "@/components/ConfirmDialog";
import AdminLogin from "@/components/AdminLogin";
import DashboardStats from "@/components/DashboardStats";
import { useAdmin } from "@/hooks/useAdmin";

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
  const { isAdmin } = useAdmin();

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
              <DashboardStats />
            )}

            {/* 管理員登入 */}
            {currentView === 'login' && (
              <div className="max-w-md mx-auto">
                <div className="glass-morphism rounded-2xl shadow-2xl overflow-hidden">
                  <div className="gradient-primary p-6 text-white">
                    <h2 className="text-2xl font-bold flex items-center">
                      <i className="fas fa-user-shield mr-3"></i>
                      管理員登入
                    </h2>
                    <p className="mt-2 text-purple-100">請輸入管理員密碼以存取系統管理功能</p>
                  </div>
                  <div className="p-8">
                    <AdminLogin />
                  </div>
                </div>
              </div>
            )}

            {/* 管理員區域 - 需要登入 */}
            {currentView === 'admin' && isAdmin && (
              <AdminSection 
                isVisible={true} 
                showConfirmDialog={showConfirmDialog} 
              />
            )}

            {/* 系統配置 - 需要管理員權限 */}
            {currentView === 'config' && isAdmin && (
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

            {/* 無權限訪問提示 */}
            {(currentView === 'admin' || currentView === 'config') && !isAdmin && (
              <div className="max-w-md mx-auto">
                <div className="glass-morphism rounded-2xl shadow-2xl overflow-hidden">
                  <div className="gradient-warning p-6 text-white">
                    <h2 className="text-2xl font-bold flex items-center">
                      <i className="fas fa-lock mr-3"></i>
                      需要管理員權限
                    </h2>
                    <p className="mt-2 text-orange-100">此功能需要管理員登入才能存取</p>
                  </div>
                  <div className="p-8 text-center">
                    <div className="mb-6">
                      <i className="fas fa-user-shield text-6xl text-gray-300"></i>
                    </div>
                    <p className="text-gray-600 mb-6">
                      您需要管理員權限才能存取系統配置和管理功能
                    </p>
                    <button
                      onClick={() => setCurrentView('login')}
                      className="gradient-primary text-white font-semibold py-3 px-6 rounded-xl btn-3d"
                    >
                      <i className="fas fa-sign-in-alt mr-2"></i>
                      前往登入
                    </button>
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
