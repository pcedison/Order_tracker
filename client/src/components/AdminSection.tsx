import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useOrders } from "@/hooks/useOrders";
import { Order } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

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
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editQuantity, setEditQuantity] = useState<string>("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState<boolean>(false);
  
  const { toast } = useToast();
  const { 
    historyOrders, 
    statsData,
    isLoadingHistory, 
    isLoadingStats,
    loadHistory, 
    generateStats,
    editHistoryOrder,
    deleteHistoryOrder
  } = useOrders();

  // 使用当前日期作为默认日期范围
  useEffect(() => {
    if (isVisible) {
      // 如果是首次显示且没有设置日期，设置默认日期范围为当前月
      if (!startDate || !endDate) {
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        const formatDate = (date: Date) => {
          return date.toISOString().split('T')[0]; // 格式化为 YYYY-MM-DD
        };
        
        setStartDate(formatDate(firstDayOfMonth));
        setEndDate(formatDate(lastDayOfMonth));
      } else if (activeTab === "history") {
        // 如果已经有日期范围且当前是历史标签页，加载历史订单
        loadHistory(startDate, endDate);
      }
    }
  }, [isVisible, activeTab, loadHistory, startDate, endDate]);
  
  // 监听日期变化加载历史订单
  useEffect(() => {
    if (isVisible && activeTab === "history" && startDate && endDate) {
      loadHistory(startDate, endDate);
    }
  }, [isVisible, activeTab, startDate, endDate, loadHistory]);
  
  // 监听订单完成事件，当临时订单被标记为完成时自动刷新历史订单
  useEffect(() => {
    const handleOrderCompleted = () => {
      console.log('订单完成事件接收，刷新历史订单');
      if (isVisible && activeTab === "history" && startDate && endDate) {
        loadHistory(startDate, endDate);
      }
    };
    
    // 添加事件监听器
    window.addEventListener('orderCompleted', handleOrderCompleted);
    
    // 清理函数
    return () => {
      window.removeEventListener('orderCompleted', handleOrderCompleted);
    };
  }, [isVisible, activeTab, startDate, endDate, loadHistory]);

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
  
  const handleEditHistoryOrder = (order: Order) => {
    setEditingOrder(order);
    setEditQuantity(order.quantity.toString());
    setIsEditDialogOpen(true);
  };
  
  const handleDeleteHistoryOrder = (orderId: string, productCode: string) => {
    showConfirmDialog(`確定要刪除產品編號為 ${productCode} 的歷史訂單嗎？此操作不可逆。`, async () => {
      try {
        await deleteHistoryOrder(orderId, productCode);
        toast({
          title: "刪除成功",
          description: "歷史訂單已成功刪除",
        });
        // 重新加载历史订单
        if (startDate && endDate) {
          loadHistory(startDate, endDate);
        }
      } catch (error) {
        console.error("Delete history order error:", error);
        toast({
          title: "刪除失敗",
          description: "無法刪除歷史訂單",
          variant: "destructive",
        });
      }
    });
  };
  
  const handleSaveEdit = async () => {
    if (!editingOrder) return;
    
    try {
      const quantity = parseInt(editQuantity);
      if (isNaN(quantity) || quantity <= 0) {
        toast({
          title: "數量無效",
          description: "請輸入有效的數量（必須大於0）",
          variant: "destructive",
        });
        return;
      }
      
      await editHistoryOrder(editingOrder.id, editingOrder.product_code, quantity);
      setIsEditDialogOpen(false);
      
      toast({
        title: "編輯成功",
        description: "訂單數量已成功更新",
      });
      
      // 重新加载历史订单
      if (startDate && endDate) {
        loadHistory(startDate, endDate);
      }
    } catch (error) {
      console.error("Edit history order error:", error);
      toast({
        title: "編輯失敗",
        description: "無法更新訂單數量",
        variant: "destructive",
      });
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="bg-[#f9f9f9] p-5 rounded-lg mt-8" id="adminSection">
      <h2 className="text-[26px] mb-4">管理員功能</h2>
      
      {/* 编辑订单对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-[24px]">編輯訂單</DialogTitle>
          </DialogHeader>
          {editingOrder && (
            <>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <div className="text-right text-[18px] font-medium">產品編號:</div>
                  <div className="col-span-3 text-[18px]">{editingOrder.product_code}</div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <div className="text-right text-[18px] font-medium">產品名稱:</div>
                  <div className="col-span-3 text-[18px]">{editingOrder.product_name}</div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <div className="text-right text-[18px] font-medium">數量 (公斤):</div>
                  <Input
                    id="quantity"
                    type="number"
                    value={editQuantity}
                    onChange={(e) => setEditQuantity(e.target.value)}
                    className="col-span-3 text-[18px] p-2 border border-[#ccc] rounded"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  type="button" 
                  onClick={() => setIsEditDialogOpen(false)}
                  className="px-4 py-2 text-[18px] bg-[#7f7f7f] text-white border-none rounded cursor-pointer hover:bg-opacity-90 mr-2"
                >
                  取消
                </Button>
                <Button 
                  type="button" 
                  onClick={handleSaveEdit}
                  className="px-4 py-2 text-[18px] bg-[#4CAF50] text-white border-none rounded cursor-pointer hover:bg-[#45a049]"
                >
                  保存更改
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      
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
            Object.keys(historyOrders).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()).map((date) => (
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
                      <th className="border border-[#ddd] p-3 bg-[#f2f2f2] text-left">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyOrders[date].map((order, index) => (
                      <tr key={`${order.id}-${order.product_code}-${index}`}>
                        <td className="border border-[#ddd] p-3">{order.product_code}</td>
                        <td className="border border-[#ddd] p-3">{order.product_name}</td>
                        <td className="border border-[#ddd] p-3">{order.quantity}</td>
                        <td className="border border-[#ddd] p-3">
                          {order.completed_at 
                            ? new Date(order.completed_at).toLocaleString("zh-TW") 
                            : "未記錄"}
                        </td>
                        <td className="border border-[#ddd] p-3">
                          <Button
                            className="px-2.5 py-1 text-base bg-[#2196F3] text-white border-none rounded cursor-pointer hover:bg-[#0b7dda] mr-2"
                            onClick={() => handleEditHistoryOrder(order)}
                          >
                            編輯
                          </Button>
                          <Button
                            className="px-2.5 py-1 text-base bg-[#f44336] text-white border-none rounded cursor-pointer hover:bg-[#d32f2f]"
                            onClick={() => handleDeleteHistoryOrder(order.id, order.product_code)}
                          >
                            刪除
                          </Button>
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
