import { useState, useEffect } from 'react';
import { useOrders } from '@/hooks/useOrders';
import { useAdmin } from '@/hooks/useAdmin';
import { Calendar, Search, FileText, Package, Clock, Eye } from 'lucide-react';
import { format, subMonths, subYears } from 'date-fns';
import { zhTW } from 'date-fns/locale';

interface Order {
  id: string;
  delivery_date: string;
  product_code: string;
  product_name: string;
  quantity: number;
  completed_at?: string;
  status: string;
}

export default function HistoryOrders() {
  const { isAdmin } = useAdmin();
  const { loadHistory, historyOrders, isLoadingHistory } = useOrders();
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [userType, setUserType] = useState<'admin' | 'member' | 'visitor'>('visitor');

  // 判斷用戶類型和訪問權限
  useEffect(() => {
    if (isAdmin) {
      setUserType('admin');
    } else {
      // 這裡可以加入會員身份檢查邏輯，暫時設為訪客
      setUserType('visitor');
    }
  }, [isAdmin]);

  // 根據用戶類型設定日期範圍
  useEffect(() => {
    const now = new Date();
    let startDate: Date;
    
    switch (userType) {
      case 'admin':
        // 管理員可查看全部歷史 - 設定為5年前
        startDate = subYears(now, 5);
        break;
      case 'member':
        // 一般會員可查看最近一年
        startDate = subYears(now, 1);
        break;
      case 'visitor':
      default:
        // 訪客可查看最近3個月
        startDate = subMonths(now, 3);
        break;
    }
    
    setDateRange({
      start: format(startDate, 'yyyy-MM-dd'),
      end: format(now, 'yyyy-MM-dd')
    });
  }, [userType]);

  // 載入歷史訂單
  useEffect(() => {
    if (!dateRange.start || !dateRange.end) return;
    
    loadHistory(dateRange.start, dateRange.end);
  }, [dateRange, loadHistory]);

  // 處理歷史訂單數據格式轉換
  useEffect(() => {
    if (historyOrders) {
      // 將 GroupedOrders 轉換為扁平的 Order 陣列
      const flatOrders: Order[] = [];
      Object.values(historyOrders).forEach(dayOrders => {
        dayOrders.forEach(order => {
          flatOrders.push({
            id: order.id,
            delivery_date: order.delivery_date,
            product_code: order.product_code,
            product_name: order.product_name,
            quantity: order.quantity,
            completed_at: order.completed_at || '',
            status: order.status
          });
        });
      });
      setOrders(flatOrders);
    }
  }, [historyOrders]);

  // 過濾訂單
  const filteredOrders = orders.filter(order => 
    order.product_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.product_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 獲取權限說明文字
  const getPermissionText = () => {
    switch (userType) {
      case 'admin':
        return '管理員 - 可查看全部歷史訂單';
      case 'member':
        return '會員 - 可查看最近一年訂單';
      case 'visitor':
      default:
        return '訪客 - 可查看最近3個月訂單';
    }
  };

  const getPermissionIcon = () => {
    switch (userType) {
      case 'admin':
        return <Eye className="h-4 w-4 text-blue-600" />;
      case 'member':
        return <Clock className="h-4 w-4 text-green-600" />;
      case 'visitor':
      default:
        return <Package className="h-4 w-4 text-gray-600" />;
    }
  };

  if (isLoadingHistory) {
    return (
      <div className="space-y-6">
        <div className="glass-card p-6">
          <div className="flex items-center space-x-2 mb-4">
            <FileText className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-800">歷史訂單</h2>
          </div>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">載入中...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 標題和權限說明 */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <FileText className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-800">歷史訂單</h2>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            {getPermissionIcon()}
            <span>{getPermissionText()}</span>
          </div>
        </div>

        {/* 搜尋功能 */}
        <div className="flex items-center space-x-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜尋產品編號或名稱..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Calendar className="h-4 w-4" />
            <span>
              {format(new Date(dateRange.start), 'yyyy/MM/dd', { locale: zhTW })} - 
              {format(new Date(dateRange.end), 'yyyy/MM/dd', { locale: zhTW })}
            </span>
          </div>
        </div>

        {/* 訂單統計 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm text-blue-600 font-medium">總訂單數</div>
            <div className="text-2xl font-bold text-blue-800">{filteredOrders.length}</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-sm text-green-600 font-medium">總數量</div>
            <div className="text-2xl font-bold text-green-800">
              {filteredOrders.reduce((sum, order) => sum + order.quantity, 0)}
            </div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-sm text-purple-600 font-medium">產品種類</div>
            <div className="text-2xl font-bold text-purple-800">
              {new Set(filteredOrders.map(order => order.product_code)).size}
            </div>
          </div>
        </div>
      </div>

      {/* 訂單列表 */}
      <div className="glass-card p-6">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">
              {searchTerm ? '找不到符合條件的訂單' : '此期間內沒有歷史訂單'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    交貨日期
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    產品編號
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    產品名稱
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    數量
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    完成時間
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(order.delivery_date), 'yyyy/MM/dd', { locale: zhTW })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                      {order.product_code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.product_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.completed_at 
                        ? format(new Date(order.completed_at), 'yyyy/MM/dd HH:mm', { locale: zhTW })
                        : '-'
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}