import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useOrders } from "@/hooks/useOrders";
import { Order } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import ConfigSettings from "./ConfigSettings";
// 引入中文字體支持
import "@fontsource/noto-sans-tc/400.css";
import "@fontsource/noto-sans-tc/700.css";

interface AdminSectionProps {
  isVisible: boolean;
  showConfirmDialog: (message: string, onConfirm: () => void) => void;
}

export default function AdminSection({ isVisible, showConfirmDialog }: AdminSectionProps) {
  // 如果不可見，直接不渲染任何內容，避免安全問題
  if (!isVisible) {
    return null;
  }
  const [activeTab, setActiveTab] = useState<"history" | "product_popularity" | "order_stats" | "config">("history");
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
  
  // 新增函數：依照日期分組訂單
  const groupByDate = (orders: Order[]) => {
    const grouped: {[date: string]: Order[]} = {};
    
    // 確保 orders 存在且是數組
    if (!orders || !Array.isArray(orders)) {
      return grouped;
    }
    
    // 依照日期排序
    const sortedOrders = [...orders].sort((a, b) => {
      return new Date(a.delivery_date).getTime() - new Date(b.delivery_date).getTime();
    });
    
    sortedOrders.forEach(order => {
      const date = order.delivery_date.split('T')[0]; // 只取日期部分
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(order);
    });
    
    return grouped;
  };
  
  // 使用瀏覽器列印功能生成報表
  const printOrderStats = () => {
    if (!statsData || !statsData.orders || statsData.orders.length === 0) {
      toast({
        title: "無法生成報表",
        description: "所選時間段內沒有訂單數據",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // 創建一個新的窗口來顯示列印內容
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      
      if (!printWindow) {
        toast({
          title: "無法開啟列印窗口",
          description: "請確保允許彈出窗口",
          variant: "destructive",
        });
        return;
      }
      
      // 報表期間
      const reportPeriod = statsData.periodText || `${statsYear}年${statsMonth ? statsMonth + '月' : '全年'}`;
      
      // 根據日期對訂單進行排序
      const sortedOrders = [...statsData.orders].sort((a, b) => {
        return new Date(a.delivery_date).getTime() - new Date(b.delivery_date).getTime();
      });
      
      // 計算總計
      const totalQuantity = statsData.totalKilograms || sortedOrders.reduce((sum, order) => sum + Number(order.quantity), 0);
      
      // 生成報表內容的HTML
      let tableContent = '';
      let currentDate = '';
      let dailyTotal = 0;
      let dailyAmount = 0;
      let grandTotal = 0;
      let grandAmount = 0;
      
      // 價格查詢映射 - 從統計數據中獲取單價
      const priceMap: {[key: string]: {unitPrice: number}} = {};
      if (statsData && statsData.stats) {
        statsData.stats.forEach(item => {
          priceMap[item.code] = {
            unitPrice: item.unitPrice || 0
          };
        });
      }
      
      // 處理訂單數據並產生表格HTML
      sortedOrders.forEach((order, index) => {
        const date = order.delivery_date.split('T')[0];
        const quantity = Number(order.quantity);
        const productCode = order.product_code || '';
        const unitPrice = productCode && priceMap[productCode] ? priceMap[productCode].unitPrice : 0;
        const totalPrice = quantity * unitPrice;
        
        // 如果日期變化，加入前一天的小計
        if (date !== currentDate && currentDate !== '') {
          tableContent += `
            <tr class="subtotal-row">
              <td>${currentDate} 小計</td>
              <td></td>
              <td></td>
              <td class="text-right">${dailyTotal.toFixed(2)}</td>
              <td></td>
              <td class="text-right">${dailyAmount.toLocaleString()}</td>
            </tr>
            <tr><td colspan="6" style="height: 10px; border: none;"></td></tr>
          `;
          dailyTotal = 0;
          dailyAmount = 0;
        }
        
        currentDate = date;
        dailyTotal += quantity;
        dailyAmount += totalPrice;
        grandTotal += quantity;
        grandAmount += totalPrice;
        
        // 添加訂單行
        tableContent += `
          <tr>
            <td>${date}</td>
            <td>${order.product_code || ''}</td>
            <td>${order.product_name || ''}</td>
            <td class="text-right">${quantity.toFixed(2)}</td>
            <td class="text-right">${unitPrice.toLocaleString()}</td>
            <td class="text-right">${totalPrice.toLocaleString()}</td>
          </tr>
        `;
      });
      
      // 添加最後一天的小計
      if (currentDate !== '') {
        tableContent += `
          <tr class="subtotal-row">
            <td>${currentDate} 小計</td>
            <td></td>
            <td></td>
            <td class="text-right">${dailyTotal.toFixed(2)}</td>
            <td></td>
            <td class="text-right">${dailyAmount.toLocaleString()}</td>
          </tr>
        `;
      }
      
      // 添加總計行
      tableContent += `
        <tr class="total-row">
          <td colspan="3">總計</td>
          <td class="text-right">${grandTotal.toFixed(2)}</td>
          <td></td>
          <td class="text-right">${grandAmount.toLocaleString()}</td>
        </tr>
      `;
      
      // 生成完整的HTML文件
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="zh-TW">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>達遠塑膠銷售報表</title>
          <style>
            body {
              font-family: "Noto Sans TC", Arial, "Microsoft JhengHei", sans-serif;
              margin: 20px;
              color: #333;
            }
            h1 {
              text-align: center;
              color: #003366;
              margin-bottom: 10px;
            }
            .report-info {
              margin-bottom: 20px;
            }
            .report-info p {
              margin: 5px 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            th {
              background-color: #2980b9;
              color: white;
              padding: 8px;
              text-align: left;
            }
            td {
              padding: 8px;
              border-bottom: 1px solid #ddd;
            }
            tr:nth-child(even) {
              background-color: #f2f2f2;
            }
            .text-right {
              text-align: right;
            }
            .subtotal-row {
              background-color: #e8e8e8;
              font-weight: bold;
            }
            .total-row {
              background-color: #d6d6d6;
              font-weight: bold;
              font-size: 1.1em;
              padding: 8px;
              margin-top: 10px;
            }
            .print-date {
              text-align: right;
              margin-top: 20px;
              font-size: 0.8em;
              color: #666;
            }
            .print-button {
              padding: 10px;
              background: #4caf50;
              color: white; 
              border: none;
              border-radius: 4px;
              cursor: pointer;
              float: right;
              margin-bottom: 20px;
            }
            @media print {
              .print-button {
                display: none;
              }
              body {
                margin: 0;
                padding: 15px;
              }
            }
          </style>
        </head>
        <body>
          <button onclick="window.print();" class="print-button">列印</button>
          
          <h1>達遠塑膠銷售報表</h1>
          
          <div class="report-info">
            <p><strong>報表期間:</strong> ${reportPeriod}</p>
            <p><strong>訂單總數:</strong> ${statsData.totalOrders} 筆</p>
            <p><strong>總公斤數:</strong> ${totalQuantity.toFixed(2)} kg</p>
            <p><strong>總金額:</strong> ${grandAmount.toLocaleString()} 元</p>
          </div>
          
          <table>
            <thead>
              <tr>
                <th style="width: 15%">日期</th>
                <th style="width: 15%">產品編號</th>
                <th style="width: 30%">產品顏色</th>
                <th style="width: 15%; text-align: right">數量(公斤)</th>
                <th style="width: 12%; text-align: right">單價(元)</th>
                <th style="width: 13%; text-align: right">總價(元)</th>
              </tr>
            </thead>
            <tbody>
              ${tableContent}
            </tbody>
          </table>
          
          <div class="total-row">
            <p><strong>總計:</strong> ${totalQuantity.toFixed(2)} kg</p>
          </div>
          
          <div class="print-date">
            列印日期: ${new Date().toLocaleDateString('zh-TW')}
          </div>
        </body>
        </html>
      `;
      
      // 寫入HTML並顯示
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // 顯示成功訊息
      toast({
        title: "報表已生成",
        description: "請使用瀏覽器的列印功能保存為PDF",
      });
    } catch (error) {
      console.error("Print generation error:", error);
      toast({
        title: "報表生成失敗",
        description: error instanceof Error ? error.message : "未知錯誤",
        variant: "destructive",
      });
    }
  };
  
  // 使用当前日期作为默认日期范围，只在第一次显示时设置
  useEffect(() => {
    if (isVisible) {
      // 如果开始日期和结束日期未设置，则设置默认值
      if (!startDate && !endDate) {
        // 设置默认日期范围为当前月第一天到当天
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        
        setStartDate(firstDayOfMonth.toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
      }
      
      // 如果當前是歷史訂單頁面，自動加載數據
      if (activeTab === "history" && startDate && endDate) {
        loadHistory(startDate, endDate);
      }
    }
  }, [isVisible, activeTab, startDate, endDate]);
  
  // 當日期改變時自動加載數據
  useEffect(() => {
    if (isVisible && activeTab === "history" && startDate && endDate) {
      loadHistory(startDate, endDate);
    }
  }, [isVisible, activeTab, startDate, endDate]);
  
  // 處理日期更改
  const handleDateChange = () => {
    if (isVisible && activeTab === "history" && startDate && endDate) {
      // 基本驗證
      if (new Date(startDate) > new Date(endDate)) {
        toast({
          title: "日期範圍無效",
          description: "開始日期不能晚於結束日期",
          variant: "destructive",
        });
        return;
      }
      
      // 在查詢前顯示加載中的狀態
      toast({
        title: "正在載入資料",
        description: "正在查詢指定日期範圍的訂單數據...",
      });
      
      // 執行歷史訂單查詢
      loadHistory(startDate, endDate);
    }
  };
  
  // 處理生成統計數據
  const handleGenerateStats = () => {
    if (!statsYear) {
      toast({
        title: "請選擇年份",
        description: "必須選擇一個有效的年份",
        variant: "destructive",
      });
      return;
    }
    
    generateStats(statsYear, statsMonth);
  };
  
  // 處理編輯歷史訂單
  const handleEditHistoryOrder = (order: Order) => {
    setEditingOrder(order);
    setEditQuantity(order.quantity.toString());
    setIsEditDialogOpen(true);
  };
  
  // 處理刪除歷史訂單
  const handleDeleteHistoryOrder = (order: Order) => {
    showConfirmDialog("確定要刪除這筆歷史訂單嗎？此操作不可撤銷。", () => {
      deleteHistoryOrder(order.id, order.product_code)
        .then(() => {
          toast({
            title: "訂單已刪除",
            description: "歷史訂單已成功刪除",
          });
          
          // 重新加載訂單列表
          if (startDate && endDate) {
            loadHistory(startDate, endDate);
          }
        })
        .catch((error) => {
          toast({
            title: "刪除失敗",
            description: error.message,
            variant: "destructive",
          });
        });
    });
  };
  
  // 提交編輯
  const handleSubmitEdit = () => {
    if (!editingOrder) return;
    
    const quantity = Number(editQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      toast({
        title: "無效的數量",
        description: "請輸入大於0的數字",
        variant: "destructive",
      });
      return;
    }
    
    editHistoryOrder(editingOrder.id, editingOrder.product_code, quantity)
      .then(() => {
        setIsEditDialogOpen(false);
        
        toast({
          title: "訂單已更新",
          description: "歷史訂單已成功更新",
        });
        
        // 重新加載訂單列表
        if (startDate && endDate) {
          loadHistory(startDate, endDate);
        }
      })
      .catch((error) => {
        toast({
          title: "更新失敗",
          description: error.message,
          variant: "destructive",
        });
      });
  };
  
  // 格式化日期
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  if (!isVisible) return null;
  
  return (
    <div className="p-4">
      <div className="mb-4">
        <div className="flex mb-2.5">
          <button
            className={`py-2.5 px-5 border border-[#ccc] ${
              activeTab === "history" ? "border-b-0 bg-white" : "bg-[#f1f1f1]"
            } rounded-t-lg`}
            onClick={() => setActiveTab("history")}
          >
            歷史訂單查詢
          </button>
          <button
            className={`py-2.5 px-5 border border-[#ccc] ${
              activeTab === "product_popularity" ? "border-b-0 bg-white" : "bg-[#f1f1f1]"
            } rounded-t-lg ml-1`}
            onClick={() => setActiveTab("product_popularity")}
          >
            產品熱度分析
          </button>
          <button
            className={`py-2.5 px-5 border border-[#ccc] ${
              activeTab === "order_stats" ? "border-b-0 bg-white" : "bg-[#f1f1f1]"
            } rounded-t-lg ml-1`}
            onClick={() => setActiveTab("order_stats")}
          >
            訂單統計
          </button>
          <button
            className={`py-2.5 px-5 border border-[#ccc] ${
              activeTab === "config" ? "border-b-0 bg-white" : "bg-[#f1f1f1]"
            } rounded-t-lg ml-1`}
            onClick={() => setActiveTab("config")}
          >
            系統設置
          </button>
        </div>
      </div>
      
      <div className="mb-8">
        {/* 歷史訂單查詢 Tab */}
        <div 
          className={`p-5 bg-white border border-[#ccc] rounded-b-lg rounded-tr-lg ${
            activeTab === "history" ? "block" : "hidden"
          }`}
        >
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <div className="flex items-center">
              <label htmlFor="startDate" className="text-lg mr-2">開始日期：</label>
              <Input 
                type="date" 
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="box-border text-[20px] h-10 leading-10 px-2.5 w-52 border border-[#ccc] rounded"
              />
            </div>
            
            <div className="flex items-center mr-3">
              <label htmlFor="endDate" className="text-lg mr-2">結束日期：</label>
              <Input 
                type="date" 
                id="endDate"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="box-border text-[20px] h-10 leading-10 px-2.5 w-52 border border-[#ccc] rounded"
              />
            </div>
            
            <Button
              onClick={handleDateChange}
              className="box-border text-[20px] h-10 px-5 bg-[#2196F3] text-white border-none rounded cursor-pointer hover:bg-[#0b7dda]"
            >
              查詢訂單
            </Button>
          </div>
          
          {isLoadingHistory ? (
            <div className="flex justify-center p-10">
              <div className="w-16 h-16 border-4 border-t-4 border-[#3498db] rounded-full animate-spin"></div>
            </div>
          ) : (
            <div>
              {!historyOrders || Object.keys(historyOrders).length === 0 ? (
                <div className="text-center p-4 bg-[#f8f9fa] rounded">
                  所選時間範圍內沒有訂單記錄
                </div>
              ) : (
                <div>
                  <div className="mb-4 text-[#333] text-lg">
                    共找到 <span className="font-bold">
                      {Object.values(historyOrders).reduce((sum, orders) => sum + (Array.isArray(orders) ? orders.length : 0), 0)}
                    </span> 筆訂單記錄
                  </div>
                  
                  {Object.entries(historyOrders).map(([date, orders]) => (
                    <div key={date} className="mb-8">
                      <h3 className="mb-2 text-xl font-semibold text-[#2196F3]">{date}</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full bg-white border border-[#ddd]">
                          <thead>
                            <tr className="bg-[#f2f2f2]">
                              <th className="p-2 text-left border-b border-[#ddd]">產品編號</th>
                              <th className="p-2 text-left border-b border-[#ddd]">產品名稱</th>
                              <th className="p-2 text-left border-b border-[#ddd]">數量(公斤)</th>
                              <th className="p-2 text-left border-b border-[#ddd]">完成時間</th>
                              <th className="p-2 text-left border-b border-[#ddd]">操作</th>
                            </tr>
                          </thead>
                          <tbody>
                            {orders.map((order) => (
                              <tr key={`${order.id}-${order.product_code}`} className="hover:bg-[#f5f5f5]">
                                <td className="p-2 border-b border-[#ddd]">{order.product_code}</td>
                                <td className="p-2 border-b border-[#ddd]">{order.product_name}</td>
                                <td className="p-2 border-b border-[#ddd]">{order.quantity}</td>
                                <td className="p-2 border-b border-[#ddd]">
                                  {order.completed_at ? new Date(order.completed_at).toLocaleDateString('zh-TW') : '尚未完成'}
                                </td>
                                <td className="p-2 border-b border-[#ddd]">
                                  <Button
                                    onClick={() => handleEditHistoryOrder(order)}
                                    className="text-xs py-1 px-2 mx-1 bg-[#2196F3] text-white hover:bg-[#0b7dda]"
                                  >
                                    編輯
                                  </Button>
                                  <Button
                                    onClick={() => handleDeleteHistoryOrder(order)}
                                    className="text-xs py-1 px-2 mx-1 bg-[#f44336] text-white hover:bg-[#d32f2f]"
                                  >
                                    刪除
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* 產品熱度分析 Tab */}
        <div 
          className={`p-5 bg-white border border-[#ccc] rounded-b-lg rounded-tr-lg ${
            activeTab === "product_popularity" ? "block" : "hidden"
          }`}
        >
          <div className="flex flex-wrap items-center gap-2.5 mb-2.5">
            <div className="flex items-center mr-2">
              <label htmlFor="popularityYearSelect" className="text-lg mr-2">選擇年份：</label>
              <select 
                id="popularityYearSelect" 
                value={statsYear}
                onChange={(e) => setStatsYear(e.target.value)}
                className="box-border text-[20px] h-10 leading-10 px-2.5 w-40 border border-[#ccc] rounded"
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
            </div>
            
            <div className="flex items-center mr-2">
              <label htmlFor="popularityMonthSelect" className="text-lg mr-2">選擇月份：</label>
              <select 
                id="popularityMonthSelect" 
                value={statsMonth}
                onChange={(e) => setStatsMonth(e.target.value)}
                className="box-border text-[20px] h-10 leading-10 px-2.5 w-40 border border-[#ccc] rounded"
              >
                <option value="">全年</option>
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
            </div>
            
            <Button
              onClick={handleGenerateStats}
              className="box-border h-10 px-5 text-[20px] bg-[#4CAF50] text-white border-none rounded cursor-pointer hover:bg-[#45a049]"
            >
              生成統計
            </Button>
          </div>
          
          {isLoadingStats && (
            <div className="flex justify-center p-10">
              <div className="w-16 h-16 border-4 border-t-4 border-[#3498db] rounded-full animate-spin"></div>
            </div>
          )}
          
          {statsData && statsData.stats && (
            <div className="mt-5">
              <h2 className="text-xl font-bold mb-3 text-[#333]">
                {statsData.periodText || `${statsYear}年${statsMonth ? statsMonth + '月' : '全年'}`} 產品熱度分析
                {statsData.totalKilograms ? ` (總計 ${statsData.totalKilograms.toFixed(2)} kg)` : ''}
              </h2>
              
              {statsData.stats.length === 0 ? (
                <div className="text-center p-4 bg-[#f8f9fa] rounded">
                  所選時間段內沒有訂單數據
                </div>
              ) : (
                <div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {statsData.stats.map((item) => {
                      // 根據銷售量計算熱度顏色
                      let color = '#4299e1'; // 默認藍色
                      let textColor = 'white';
                      const percentage = item.totalQuantity / statsData.totalKilograms * 100;
                      
                      if (percentage >= 25) {
                        color = '#e53e3e'; // 紅色 (熱銷)
                      } else if (percentage >= 15) {
                        color = '#ed8936'; // 橙色 (較熱銷)
                      } else if (percentage >= 5) {
                        color = '#ecc94b'; // 黃色 (一般)
                        textColor = 'black';
                      }
                      
                      return (
                        <div 
                          key={item.code} 
                          className="border rounded-md overflow-hidden shadow-sm"
                          style={{ backgroundColor: color }}
                        >
                          <div className="p-4">
                            <h3 className={`font-medium text-lg ${textColor === 'white' ? 'text-white' : 'text-black'}`}>{item.name}</h3>
                            <div className={`text-sm ${textColor === 'white' ? 'text-white' : 'text-black'} opacity-90`}>
                              產品編號: {item.code}
                            </div>
                            <div className={`text-lg font-semibold mt-2 ${textColor === 'white' ? 'text-white' : 'text-black'}`}>
                              {item.totalQuantity.toFixed(2)} kg
                            </div>
                            <div className={`text-sm ${textColor === 'white' ? 'text-white' : 'text-black'} opacity-90`}>
                              訂單數: {item.orderCount} | 佔比: {percentage.toFixed(2)}%
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* 热度图例 */}
                  <div className="mt-6 border border-gray-200 rounded-md p-3 bg-gray-50">
                    <h3 className="font-medium text-gray-700 mb-2">銷售熱度說明:</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center">
                        <div className="w-4 h-4 rounded-full bg-red-600 mr-2"></div>
                        <span className="text-sm">熱銷商品 (≥ 25%)</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-4 h-4 rounded-full bg-orange-500 mr-2"></div>
                        <span className="text-sm">較熱銷商品 (15-25%)</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-4 h-4 rounded-full bg-yellow-400 mr-2"></div>
                        <span className="text-sm">一般熱銷商品 (5-15%)</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-4 h-4 rounded-full bg-blue-500 mr-2"></div>
                        <span className="text-sm">低熱度商品 (小於 5%)</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* 訂單統計 Tab */}
      <div 
        className={`p-5 bg-white border border-[#ccc] rounded-b-lg rounded-tr-lg ${
          activeTab === "order_stats" ? "block" : "hidden"
        }`}
      >
        <div className="flex flex-wrap items-center gap-2.5 mb-2.5">
          <div className="flex items-center mr-2">
            <label htmlFor="orderStatsYearSelect" className="text-lg mr-2">選擇年份：</label>
            <select 
              id="orderStatsYearSelect" 
              value={statsYear}
              onChange={(e) => setStatsYear(e.target.value)}
              className="box-border text-[20px] h-10 leading-10 px-2.5 w-40 border border-[#ccc] rounded"
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
          </div>
          
          <div className="flex items-center mr-2">
            <label htmlFor="orderStatsMonthSelect" className="text-lg mr-2">選擇月份：</label>
            <select 
              id="orderStatsMonthSelect" 
              value={statsMonth}
              onChange={(e) => setStatsMonth(e.target.value)}
              className="box-border text-[20px] h-10 leading-10 px-2.5 w-40 border border-[#ccc] rounded"
            >
              <option value="">全年</option>
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
          </div>
          
          <div className="flex items-center flex-wrap gap-2">
            <Button
              onClick={handleGenerateStats}
              className="box-border h-10 px-5 text-[20px] bg-[#4CAF50] text-white border-none rounded cursor-pointer hover:bg-[#45a049]"
            >
              生成統計
            </Button>
            
            <Button
              onClick={printOrderStats}
              className="box-border h-10 px-5 text-[20px] bg-[#2196F3] text-white border-none rounded cursor-pointer hover:bg-[#0b7dda]"
            >
              列印報表
            </Button>
          </div>
          
          <div className="w-full mt-2 text-sm text-gray-500">
            請使用「列印報表」功能，可直接列印或另存為PDF（完整支援中文）
          </div>
        </div>
        
        {isLoadingStats && (
          <div className="flex justify-center p-10">
            <div className="w-16 h-16 border-4 border-t-4 border-[#3498db] rounded-full animate-spin"></div>
          </div>
        )}
        
        {statsData && statsData.stats && (
          <div className="mt-5">
            <h2 className="text-xl font-bold mb-3 text-[#333]">
              {statsData.periodText || `${statsYear}年${statsMonth ? statsMonth + '月' : '全年'}`} 訂單統計
              {statsData.totalKilograms ? ` (總計 ${statsData.totalKilograms.toFixed(2)} kg)` : ''}
              {statsData.totalAmount ? ` (總金額 ${statsData.totalAmount.toLocaleString()} 元)` : ''}
            </h2>
            
            {!statsData.orders || statsData.orders.length === 0 ? (
              <div className="text-center p-4 bg-[#f8f9fa] rounded">
                所選時間段內沒有訂單數據
              </div>
            ) : (
              <div>
                <table className="w-full border-collapse border border-gray-300">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border border-gray-300 p-2 text-left">產品編號</th>
                      <th className="border border-gray-300 p-2 text-left">產品名稱</th>
                      <th className="border border-gray-300 p-2 text-right">訂單數量</th>
                      <th className="border border-gray-300 p-2 text-right">總公斤數</th>
                      <th className="border border-gray-300 p-2 text-right">單價</th>
                      <th className="border border-gray-300 p-2 text-right">總價</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statsData.stats.map((item) => (
                      <tr key={item.code} className="hover:bg-gray-50">
                        <td className="border border-gray-300 p-2">{item.code}</td>
                        <td className="border border-gray-300 p-2">{item.name}</td>
                        <td className="border border-gray-300 p-2 text-right">{item.orderCount}</td>
                        <td className="border border-gray-300 p-2 text-right">{item.totalQuantity.toFixed(2)}</td>
                        <td className="border border-gray-300 p-2 text-right">{item.unitPrice ? item.unitPrice.toLocaleString() : '0'}</td>
                        <td className="border border-gray-300 p-2 text-right">{item.totalPrice ? item.totalPrice.toLocaleString() : '0'}</td>
                      </tr>
                    ))}
                    <tr className="bg-gray-200 font-bold">
                      <td className="border border-gray-300 p-2" colSpan={3}>總計</td>
                      <td className="border border-gray-300 p-2 text-right">{statsData.totalKilograms.toFixed(2)}</td>
                      <td className="border border-gray-300 p-2 text-right">-</td>
                      <td className="border border-gray-300 p-2 text-right">{statsData.totalAmount ? statsData.totalAmount.toLocaleString() : '0'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* 系統設置 Tab */}
      <div 
        className={`p-5 bg-white border border-[#ccc] rounded-b-lg rounded-tr-lg ${
          activeTab === "config" ? "block" : "hidden"
        }`}
      >
        <ConfigSettings />
      </div>
      
      {/* 編輯歷史訂單對話框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>修改歷史訂單</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {editingOrder && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">產品編號</label>
                    <Input value={editingOrder.product_code} disabled className="bg-gray-100" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">產品名稱</label>
                    <Input value={editingOrder.product_name} disabled className="bg-gray-100" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">數量(公斤)</label>
                  <Input 
                    type="number" 
                    value={editQuantity}
                    onChange={(e) => setEditQuantity(e.target.value)}
                    min="0.01" 
                    step="0.01" 
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsEditDialogOpen(false)} variant="outline">取消</Button>
            <Button onClick={handleSubmitEdit}>保存更改</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
