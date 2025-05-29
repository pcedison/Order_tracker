import { useState, useEffect } from 'react';
import { Bell, Package, Settings, User, TrendingUp, AlertCircle, CheckCircle, Info } from 'lucide-react';

interface Notification {
  id: string;
  type: 'order' | 'admin' | 'system' | 'stats';
  title: string;
  message: string;
  time: Date;
  read: boolean;
  icon?: React.ReactNode;
}

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  const loadNotifications = () => {
    // 從 localStorage 載入通知數據
    const savedNotifications = localStorage.getItem('notifications');
    if (savedNotifications) {
      try {
        const parsed = JSON.parse(savedNotifications).map((notif: any) => ({
          ...notif,
          time: new Date(notif.time)
        }));
        setNotifications(parsed);
      } catch (error) {
        console.error('Failed to parse notifications:', error);
        setNotifications([]);
      }
    } else {
      setNotifications([]);
    }
  };

  const markAsRead = (id: string) => {
    const updatedNotifications = notifications.map(notif => 
      notif.id === id ? { ...notif, read: true } : notif
    );
    setNotifications(updatedNotifications);
    localStorage.setItem('notifications', JSON.stringify(updatedNotifications));
    window.dispatchEvent(new CustomEvent('notificationChanged'));
  };

  const clearAll = () => {
    setNotifications([]);
    localStorage.setItem('notifications', JSON.stringify([]));
    window.dispatchEvent(new CustomEvent('notificationChanged'));
  };

  const getTimeAgo = (time: Date) => {
    const now = new Date();
    const diff = now.getTime() - time.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days > 0) return `${days} 天前`;
    if (hours > 0) return `${hours} 小時前`;
    if (minutes > 0) return `${minutes} 分鐘前`;
    return '剛才';
  };

  const getTypeColor = (type: Notification['type']) => {
    switch (type) {
      case 'order': return 'bg-blue-100 text-blue-800';
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'system': return 'bg-green-100 text-green-800';
      case 'stats': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 mt-2 w-80 glass-morphism rounded-xl shadow-2xl z-50 dropdown-animation">
      {/* 標題欄 */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Bell size={18} className="text-gray-600" />
          <h3 className="font-semibold text-gray-800">通知中心</h3>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <button
          onClick={clearAll}
          className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          清除全部
        </button>
      </div>

      {/* 通知列表 */}
      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Bell size={48} className="mx-auto mb-3 text-gray-300" />
            <p>暫無通知</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => markAsRead(notification.id)}
                className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                  !notification.read ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    {notification.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className={`text-sm font-medium ${
                        !notification.read ? 'text-gray-900' : 'text-gray-700'
                      }`}>
                        {notification.title}
                      </h4>
                      <span className={`text-xs px-2 py-1 rounded-full ${getTypeColor(notification.type)}`}>
                        {notification.type === 'order' && '訂單'}
                        {notification.type === 'admin' && '管理'}
                        {notification.type === 'system' && '系統'}
                        {notification.type === 'stats' && '統計'}
                      </span>
                    </div>
                    <p className={`text-sm mt-1 ${
                      !notification.read ? 'text-gray-700' : 'text-gray-500'
                    }`}>
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      {getTimeAgo(notification.time)}
                    </p>
                  </div>
                  {!notification.read && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>


    </div>
  );
}