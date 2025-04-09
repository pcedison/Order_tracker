import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useOrders } from "@/hooks/useOrders";

interface AdminSectionProps {
  isVisible: boolean;
  showConfirmDialog: (message: string, onConfirm: () => void) => void;
}

export default function AdminSection({ isVisible, showConfirmDialog }: AdminSectionProps) {
  const [activeTab, setActiveTab] = useState<"history" | "stats">("history");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [statsYear, setStatsYear] = useState<string>("2025");
  const [statsMonth, setStatsMonth] = useState<string>("");
  
  const { toast } = useToast();
  const { 
    historyOrders, 
    statsData,
    isLoadingHistory, 
    isLoadingStats,
    loadHistory, 
    generateStats 
  } = useOrders();

  useEffect(() => {
    if (isVisible && activeTab === "history" && startDate && endDate) {
      loadHistory(startDate, endDate);
    }
  }, [isVisible, activeTab, loadHistory, startDate, endDate]);

  const handleFilterHistory = () => {
    if (!startDate || !endDate) {
      toast({
        title: "日期選擇",
        description: "請選擇起始和結束日期",
        variant: "destructive",
      });
      return;
    }
    
    loadHistory(startDate, endDate);
  };

  const handleGenerateStats = () => {
    if (!statsYear) {
      toast({
        title: "年份選擇",
        description: "請選擇年份",
        variant: "destructive",
      });
      return;
    }
    
    generateStats(statsYear, statsMonth);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="bg-[#f9f9f9] p-5 rounded-lg mt-8" id="adminSection">
      <h2 className="text-[26px] mb-4">管理員功能</h2>
      
      <div className="flex mb-5">
        <div 
          className={`px-5 py-2.5 text-[20px] cursor-pointer rounded-t-lg mr-1 ${
            activeTab === "history" 
              ? "active bg-white border border-[#ccc] border-b-0" 
              : "bg-[#ddd]"
          }`}
          onClick={() => setActiveTab("history")}
        >
          歷史訂單
        </div>
        <div 
          className={`px-5 py-2.5 text-[20px] cursor-pointer rounded-t-lg mr-1 ${
            activeTab === "stats" 
              ? "active bg-white border border-[#ccc] border-b-0" 
              : "bg-[#ddd]"
          }`}
          onClick={() => setActiveTab("stats")}
        >
          訂單統計
        </div>
      </div>
      
      {/* History Tab */}
      <div 
        className={`p-5 bg-white border border-[#ccc] rounded-b-lg rounded-tr-lg ${
          activeTab === "history" ? "block" : "hidden"
        }`}
      >
        <div className="mb-4">
          <label htmlFor="startDate" className="text-lg mr-2.5">起始日期：</label>
          <Input
            type="date"
            id="startDate"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="p-2 text-lg border border-[#ccc] rounded inline-block w-auto"
          />
          
          <label htmlFor="endDate" className="text-lg mx-2.5">結束日期：</label>
          <Input
            type="date"
            id="endDate"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="p-2 text-lg border border-[#ccc] rounded inline-block w-auto"
          />
          
          <Button
            id="filterDateBtn"
            onClick={handleFilterHistory}
            className="px-4 py-2 text-lg bg-[#4CAF50] text-white border-none rounded cursor-pointer mx-2 hover:bg-[#45a049]"
          >
            篩選
          </Button>
          
          <Button
            id="refreshHistoryBtn"
            onClick={() => startDate && endDate && loadHistory(startDate, endDate)}
            className="px-4 py-2 text-lg bg-[#607d8b] text-white border-none rounded cursor-pointer hover:bg-opacity-90"
          >
            刷新
          </Button>
        </div>
        
        <div id="historyContainer">
          {!startDate || !endDate ? (
            <div className="text-center py-5 text-[22px] text-gray-600">請選擇日期範圍</div>
          ) : isLoadingHistory ? (
            <div className="text-center py-5 text-[22px] text-gray-600">正在載入歷史訂單...</div>
          ) : Object.keys(historyOrders).length === 0 ? (
            <div className="text-center py-5 text-[22px] text-gray-600">選定範圍內沒有完成的訂單</div>
          ) : (
            Object.keys(historyOrders).sort().map((date) => (
              <div key={date} className="mb-8 border border-neutral-dark rounded-lg p-5">
                <div className="text-[24px] mb-4 font-bold">
                  到貨日期: {new Date(date).toLocaleDateString("zh-TW")}
                </div>
                <table className="w-full border-collapse text-[22px]">
                  <thead>
                    <tr>
                      <th className="border border-[#ddd] p-3 bg-[#f2f2f2] text-left">產品編號</th>
                      <th className="border border-[#ddd] p-3 bg-[#f2f2f2] text-left">產品名稱</th>
                      <th className="border border-[#ddd] p-3 bg-[#f2f2f2] text-left">數量 (公斤)</th>
                      <th className="border border-[#ddd] p-3 bg-[#f2f2f2] text-left">完成時間</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyOrders[date].map((order) => (
                      <tr key={order.id}>
                        <td className="border border-[#ddd] p-3">{order.product_code}</td>
                        <td className="border border-[#ddd] p-3">{order.product_name}</td>
                        <td className="border border-[#ddd] p-3">{order.quantity}</td>
                        <td className="border border-[#ddd] p-3">
                          {order.completed_at 
                            ? new Date(order.completed_at).toLocaleString("zh-TW") 
                            : "未記錄"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Stats Tab */}
      <div 
        className={`p-5 bg-white border border-[#ccc] rounded-b-lg rounded-tr-lg ${
          activeTab === "stats" ? "block" : "hidden"
        }`}
      >
        <div className="flex items-center gap-2.5 mb-2.5">
          <label htmlFor="statsYearSelect" className="text-lg">選擇年份：</label>
          <select 
            id="statsYearSelect" 
            value={statsYear}
            onChange={(e) => setStatsYear(e.target.value)}
            className="box-border text-[20px] h-10 leading-10 px-2.5 w-56 border border-[#ccc] rounded"
          >
            {/* Years 2025 ~ 2035 */}
            <option value="2025">2025</option>
            <option value="2026">2026</option>
            <option value="2027">2027</option>
            <option value="2028">2028</option>
            <option value="2029">2029</option>
            <option value="2030">2030</option>
            <option value="2031">2031</option>
            <option value="2032">2032</option>
            <option value="2033">2033</option>
            <option value="2034">2034</option>
            <option value="2035">2035</option>
          </select>
          
          <label htmlFor="statsMonthSelect" className="text-lg">選擇月份：</label>
          <select 
            id="statsMonthSelect"
            value={statsMonth}
            onChange={(e) => setStatsMonth(e.target.value)}
            className="box-border text-[20px] h-10 leading-10 px-2.5 w-56 border border-[#ccc] rounded"
          >
            <option value="">全部月份</option>
            <option value="1">1月</option>
            <option value="2">2月</option>
            <option value="3">3月</option>
            <option value="4">4月</option>
            <option value="5">5月</option>
            <option value="6">6月</option>
            <option value="7">7月</option>
            <option value="8">8月</option>
            <option value="9">9月</option>
            <option value="10">10月</option>
            <option value="11">11月</option>
            <option value="12">12月</option>
          </select>
          
          <Button
            id="generateStatsBtn"
            onClick={handleGenerateStats}
            className="px-4 py-2 text-lg bg-[#4CAF50] text-white border-none rounded cursor-pointer hover:bg-[#45a049]"
          >
            生成銷售統計
          </Button>
        </div>
        
        <div id="statsContainer">
          {isLoadingStats ? (
            <div className="text-center py-5 text-[22px] text-gray-600">正在生成統計資料...</div>
          ) : !statsData ? (
            <div className="text-center py-5 text-[22px] text-gray-600">請選擇時間範圍並按下生成按鈕...</div>
          ) : statsData.stats.length === 0 ? (
            <div className="text-center py-5 text-[22px] text-gray-600">選定範圍內沒有完成的訂單</div>
          ) : (
            <div>
              <div className="text-[24px] mt-5 mb-2.5 font-bold text-gray-800">
                {statsData.periodText}銷售統計
              </div>
              <table className="w-full border-collapse mt-2.5">
                <thead>
                  <tr>
                    <th className="p-3 text-left bg-[#f8f8f8] text-gray-800 border-b-2 border-[#ddd]">產品編號</th>
                    <th className="p-3 text-left bg-[#f8f8f8] text-gray-800 border-b-2 border-[#ddd]">產品名稱</th>
                    <th className="p-3 text-left bg-[#f8f8f8] text-gray-800 border-b-2 border-[#ddd]">訂單數量</th>
                    <th className="p-3 text-left bg-[#f8f8f8] text-gray-800 border-b-2 border-[#ddd]">總公斤數</th>
                  </tr>
                </thead>
                <tbody>
                  {statsData.stats.map((stat) => (
                    <tr key={stat.code}>
                      <td className="p-3 border-b border-[#eee]">{stat.code}</td>
                      <td className="p-3 border-b border-[#eee]">{stat.name}</td>
                      <td className="p-3 border-b border-[#eee]">{stat.orderCount}</td>
                      <td className="p-3 border-b border-[#eee]">{stat.totalQuantity.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 text-gray-600">總計: {statsData.totalOrders} 筆訂單</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
