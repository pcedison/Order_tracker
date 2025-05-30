import { useState, useEffect } from 'react';
import { useOrders } from '@/hooks/useOrders';
import { useAdmin } from '@/hooks/useAdmin';
import { Calendar, Search, FileText, Package, Clock, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;

  // 判斷用戶類型和訪問權限
  useEffect(() => {
    console.log('HistoryOrders - isAdmin value:', isAdmin);
    if (isAdmin) {
      setUserType('admin');
    } else {
      // 簡化邏輯：非管理員都視為訪客，限制查看最近3個月
      setUserType('visitor');
    }
  }, [isAdmin]);

  // 根據用戶類型設定日期範圍
  useEffect(() => {
    const today = new Date();
    let startDate: Date;
    let endDate: Date = today;

    switch (userType) {
      case 'admin':
        // 管理員可查看全部歷史（從2020年開始）
        startDate = new Date('2020-05-30');
        break;
      case 'member':
        // 會員可查看最近一年
        startDate = subYears(today, 1);
        break;
      case 'visitor':
      default:
        // 訪客只能查看最近3個月
        startDate = subMonths(today, 3);
        break;
    }

    const dateRange = {
      start: format(startDate, 'yyyy-MM-dd'),
      end: format(endDate, 'yyyy-MM-dd')
    };
    
    setDateRange(dateRange);
    
    loadHistory(dateRange.start, dateRange.end);
  }, [userType, loadHistory]);

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

  // 分頁計算
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

  // 重置分頁當搜尋條件改變時
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // 獲取權限說明文字
  const getPermissionText = () => {
    switch (userType) {
      case 'admin':
        return '管理員 - 可查看全部歷史';
      case 'member':
        return '會員 - 可查看最近一年';
      case 'visitor':
      default:
        return '訪客 - 可查看最近3個月';
    }
  };

  if (isLoadingHistory) {
    return (
      <div className="space-y-6">
        <div className="glass-card p-8 text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-600">載入歷史訂單中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 標題區域 */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">歷史訂單</h1>
              <p className="text-gray-600">{getPermissionText()}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
            <Eye className="h-4 w-4" />
            <span>{getPermissionText()}</span>
          </div>
        </div>

        {/* 搜尋功能 */}
        <div className="flex items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜尋產品編號或名稱..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
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
          <div>
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
                  {paginatedOrders.map((order, index) => (
                    <tr key={`${order.id}-${startIndex + index}`} className="hover:bg-gray-50">
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

            {/* 分頁控制 */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  顯示第 {startIndex + 1}-{Math.min(endIndex, filteredOrders.length)} 筆，共 {filteredOrders.length} 筆資料
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    上一頁
                  </button>
                  
                  {/* 頁碼按鈕 */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNumber = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                    if (pageNumber <= totalPages) {
                      return (
                        <button
                          key={pageNumber}
                          onClick={() => setCurrentPage(pageNumber)}
                          className={`px-3 py-2 text-sm font-medium rounded-md ${
                            currentPage === pageNumber
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {pageNumber}
                        </button>
                      );
                    }
                    return null;
                  })}
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    下一頁
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}