import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAdmin } from '@/context/AdminContext';
import { Bell, Settings, User, Menu, X, Package } from 'lucide-react';
import NotificationCenter from './NotificationCenter';

interface NavigationProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

export default function Navigation({ currentView, onViewChange }: NavigationProps) {
  const [, setLocation] = useLocation();
  const { isAdmin, logout } = useAdmin();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);

  const navItems = [
    { id: 'orders', label: '新增訂單', icon: 'fas fa-plus-circle', route: '/' },
    { id: 'list', label: '訂單列表', icon: 'fas fa-list-ul', route: '/orders' },
    { id: 'history', label: '歷史訂單', icon: 'fas fa-history', route: '/history' },
    { id: 'dashboard', label: '數據分析', icon: 'fas fa-chart-line', route: '/dashboard' }
  ];

  // 檢查未讀通知
  useEffect(() => {
    const checkUnreadNotifications = () => {
      const savedNotifications = localStorage.getItem('notifications');
      if (savedNotifications) {
        try {
          const notifications = JSON.parse(savedNotifications);
          const unreadCount = notifications.filter((notif: any) => !notif.read).length;
          setHasUnreadNotifications(unreadCount > 0);
        } catch (error) {
          setHasUnreadNotifications(false);
        }
      } else {
        setHasUnreadNotifications(false);
      }
    };

    // 初始檢查
    checkUnreadNotifications();

    // 監聽通知變化
    const handleNotificationChange = () => {
      checkUnreadNotifications();
    };

    // 監聽管理員狀態變化，確保狀態同步
    const handleAdminStatusChange = (event: any) => {
      // 強制重新渲染組件以反映最新狀態
      setIsSettingsOpen(false);
      setIsNotificationOpen(false);
      setForceUpdate(prev => prev + 1);
    };

    window.addEventListener('notificationChanged', handleNotificationChange);
    window.addEventListener('adminStatusChanged', handleAdminStatusChange);
    
    return () => {
      window.removeEventListener('notificationChanged', handleNotificationChange);
      window.removeEventListener('adminStatusChanged', handleAdminStatusChange);
    };
  }, []);

  const handleNavClick = (item: any) => {
    onViewChange(item.id);
    setLocation(item.route);
    setIsMobileMenuOpen(false);
  };

  const handleSettingsClick = () => {
    setIsSettingsOpen(!isSettingsOpen);
    setIsNotificationOpen(false);
  };

  const handleNotificationClick = () => {
    setIsNotificationOpen(!isNotificationOpen);
    setIsSettingsOpen(false);
  };

  return (
    <>
      {/* 主導航欄 */}
      <nav className="glass-morphism fixed top-0 left-0 right-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* 左側 Logo 和導航 */}
            <div className="flex items-center space-x-4">
              <div className="gradient-primary p-2.5 rounded-xl shadow-lg">
                <Package className="text-white" size={20} />
              </div>
              <h1 className="text-xl font-bold text-gray-800">達遠訂單系統 Pro</h1>
              
              {/* 桌面版導航按鈕 */}
              <div className="hidden md:flex items-center ml-8 space-x-1">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item)}
                    className={`nav-btn px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
                      currentView === item.id ? 'active' : ''
                    }`}
                  >
                    <i className={`${item.icon} text-sm`}></i>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 右側功能區 */}
            <div className="flex items-center space-x-4">
              {/* 通知鈴鐺 */}
              <div className="relative">
                <button
                  onClick={handleNotificationClick}
                  className="p-2 text-gray-600 hover:text-gray-800 transition-colors relative"
                >
                  <Bell size={18} />
                  {hasUnreadNotifications && (
                    <span className="pulse-dot absolute top-0 right-0"></span>
                  )}
                </button>
                
                <NotificationCenter 
                  isOpen={isNotificationOpen} 
                  onClose={() => setIsNotificationOpen(false)} 
                />
              </div>

              {/* 設定齒輪 */}
              <div className="relative">
                <button
                  onClick={handleSettingsClick}
                  className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <Settings size={18} />
                </button>
                
                {/* 設定下拉選單 */}
                {isSettingsOpen && (
                  <div className="absolute right-0 mt-2 w-64 glass-morphism rounded-xl shadow-2xl z-50 dropdown-animation">
                    <div className="p-4 border-b border-gray-200">
                      <h3 className="font-semibold text-gray-800">系統設定</h3>
                    </div>
                    <div className="p-2">
                      {!isAdmin ? (
                        <button
                          onClick={() => onViewChange('login')}
                          className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors flex items-center space-x-3"
                        >
                          <User size={16} className="text-gray-500" />
                          <span>管理員登入</span>
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => onViewChange('config')}
                            className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors flex items-center space-x-3"
                          >
                            <Settings size={16} className="text-gray-500" />
                            <span>系統配置</span>
                          </button>
                          <button
                            onClick={() => onViewChange('admin')}
                            className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors flex items-center space-x-3"
                          >
                            <User size={16} className="text-gray-500" />
                            <span>管理員區域</span>
                          </button>
                          <button
                            onClick={() => {
                              // 添加測試通知
                              const testNotification = {
                                id: Date.now().toString(),
                                type: 'order',
                                title: '測試通知',
                                message: '這是一個測試通知，用來驗證通知功能正常運作',
                                time: new Date().toISOString(),
                                read: false
                              };
                              
                              const savedNotifications = localStorage.getItem('notifications');
                              const notifications = savedNotifications ? JSON.parse(savedNotifications) : [];
                              const updatedNotifications = [testNotification, ...notifications];
                              localStorage.setItem('notifications', JSON.stringify(updatedNotifications));
                              window.dispatchEvent(new CustomEvent('notificationChanged'));
                              setIsSettingsOpen(false);
                            }}
                            className="w-full text-left px-4 py-3 rounded-lg hover:bg-blue-50 transition-colors flex items-center space-x-3 text-blue-600"
                          >
                            <Bell size={16} className="text-blue-500" />
                            <span>新增測試通知</span>
                          </button>
                          <div className="border-t border-gray-200 my-2"></div>
                          <button
                            onClick={async () => {
                              await logout();
                              setIsSettingsOpen(false);
                            }}
                            className="w-full text-left px-4 py-3 rounded-lg hover:bg-red-50 transition-colors flex items-center space-x-3 text-red-600"
                          >
                            <i className="fas fa-sign-out-alt text-sm"></i>
                            <span>登出管理員</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 用戶頭像和信息 */}
              <div className="flex items-center space-x-3 pl-4 border-l-2 border-gray-200">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-gray-800">
                    {isAdmin ? '系統管理員' : '訪客用戶'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {isAdmin ? 'pcedison@gmail.com' : '查看模式'}
                  </p>

                </div>
                <div className="gradient-primary w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-md">
                  {isAdmin ? 'A' : 'G'}
                </div>
              </div>

              {/* 手機版選單按鈕 */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* 手機版下拉選單 */}
        {isMobileMenuOpen && (
          <div className="md:hidden glass-morphism border-t border-gray-200 animate-slide-in">
            <div className="px-4 py-4 space-y-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-center space-x-3 ${
                    currentView === item.id
                      ? 'gradient-primary text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <i className={`${item.icon} text-sm`}></i>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* 點擊外部關閉下拉選單 */}
      {(isNotificationOpen || isSettingsOpen) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setIsNotificationOpen(false);
            setIsSettingsOpen(false);
          }}
        />
      )}
    </>
  );
}