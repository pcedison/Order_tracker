import { useState, useEffect } from "react";
import { useOrders } from "@/hooks/useOrders";
import { Calendar, Package, TrendingUp, DollarSign, Printer } from 'lucide-react';

export default function DashboardStats() {
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const { generateStats, isLoadingStats, statsData } = useOrders();

  // 載入統計數據 - 移除 generateStats 依賴避免無限循環
  useEffect(() => {
    const loadStats = async () => {
      try {
        await generateStats(selectedYear, selectedMonth);
      } catch (error) {
        console.error("載入統計數據失敗:", error);
      }
    };

    loadStats();
  }, [selectedYear, selectedMonth]);

  // 列印功能
  const handlePrint = () => {
    window.print();
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - 2 + i).toString());
  const months = [
    { value: "", label: "全年" },
    { value: "1", label: "1月" },
    { value: "2", label: "2月" },
    { value: "3", label: "3月" },
    { value: "4", label: "4月" },
    { value: "5", label: "5月" },
    { value: "6", label: "6月" },
    { value: "7", label: "7月" },
    { value: "8", label: "8月" },
    { value: "9", label: "9月" },
    { value: "10", label: "10月" },
    { value: "11", label: "11月" },
    { value: "12", label: "12月" },
  ];



  return (
    <div className="space-y-6">
      {/* 標題和篩選器 */}
      <div className="dashboard-header glass-morphism rounded-2xl shadow-2xl overflow-hidden">
        <div className="gradient-info p-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold flex items-center">
                <TrendingUp className="mr-3" size={24} />
                數據分析儀表板
              </h2>
              <p className="mt-2 text-blue-100">查看訂單統計和完成記錄</p>
            </div>
            
            {/* 列印按鈕 */}
            <button
              onClick={handlePrint}
              className="print-hidden bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Printer size={16} />
              <span>列印報表</span>
            </button>
          </div>
        </div>
        
        <div className="p-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center space-x-2">
              <Calendar className="text-purple-500" size={16} />
              <label className="text-sm font-semibold text-gray-700">年份:</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="input-modern px-3 py-2 rounded-lg text-gray-800 text-sm"
              >
                {years.map(year => (
                  <option key={year} value={year}>{year}年</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <label className="text-sm font-semibold text-gray-700">月份:</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="input-modern px-3 py-2 rounded-lg text-gray-800 text-sm"
              >
                {months.map(month => (
                  <option key={month.value} value={month.value}>{month.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 統計卡片 */}
      {statsData && (
        <div className="stats-cards grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="stats-card stat-card glass-morphism rounded-xl p-6 card-hover">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-600">總訂單數</h3>
                <p className="value text-2xl font-bold text-gray-900">{statsData.totalOrders}</p>
              </div>
              <Package className="text-blue-500 print-hidden" size={32} />
            </div>
          </div>
          
          <div className="stats-card stat-card glass-morphism rounded-xl p-6 card-hover">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-600">總公斤數</h3>
                <p className="value text-2xl font-bold text-gray-900">{statsData.totalKilograms}</p>
              </div>
              <i className="fas fa-weight text-green-500 text-2xl print-hidden"></i>
            </div>
          </div>
          
          <div className="stats-card stat-card glass-morphism rounded-xl p-6 card-hover">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-600">總包數</h3>
                <p className="value text-2xl font-bold text-gray-900">{Math.ceil(statsData.totalKilograms / 25)}</p>
              </div>
              <i className="fas fa-boxes text-purple-500 text-2xl print-hidden"></i>
            </div>
          </div>
          
          <div className="stats-card stat-card glass-morphism rounded-xl p-6 card-hover">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-600">總金額</h3>
                <p className="value text-2xl font-bold text-gray-900">
                  ${statsData.totalAmount?.toLocaleString() || '0'}
                </p>
              </div>
              <DollarSign className="text-yellow-500 print-hidden" size={32} />
            </div>
          </div>
        </div>
      )}

      {/* 產品統計表 */}
      {statsData?.stats && statsData.stats.length > 0 && (
        <div className="glass-morphism rounded-2xl shadow-2xl overflow-hidden">
          <div className="gradient-primary p-6 text-white print-hidden">
            <h3 className="text-xl font-bold">產品統計 - {statsData.periodText}</h3>
          </div>
          <h3 className="print-title hidden print:block text-center text-lg font-bold mb-4">產品統計 - {statsData.periodText}</h3>
          <div className="overflow-x-auto">
            <table className="product-stats-table w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">產品編號</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">產品名稱</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">訂單次數</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">總數量</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">單價</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">總價</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {statsData.stats.map((item, index) => (
                  <tr key={index} className="table-row-hover">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {item.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {item.orderCount} 次
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {item.totalQuantity} 公斤
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      ${item.unitPrice || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ${item.totalPrice?.toLocaleString() || '0'}
                    </td>
                  </tr>
                ))}
                {/* 總計行 */}
                <tr className="bg-gray-100 border-t-2 border-gray-300">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900" colSpan={2}>
                    總計
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                    {statsData.totalOrders} 次
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                    {statsData.totalKilograms} 公斤 ({Math.ceil(statsData.totalKilograms / 25)} 包)
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                    -
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                    ${statsData.totalAmount?.toLocaleString() || '0'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}



      {/* 載入中狀態 */}
      {isLoadingStats && (
        <div className="glass-morphism rounded-xl p-8 text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-600">載入數據中...</p>
        </div>
      )}
    </div>
  );
}