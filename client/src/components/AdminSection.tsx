import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useOrders } from "@/hooks/useOrders";
import { Order } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import ConfigSettings from "./ConfigSettings";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as ExcelJS from "exceljs";
// 引入中文字體支持
import "@fontsource/noto-sans-tc/400.css";
import "@fontsource/noto-sans-tc/700.css";

interface AdminSectionProps {
  isVisible: boolean;
  showConfirmDialog: (message: string, onConfirm: () => void) => void;
}

export default function AdminSection({ isVisible, showConfirmDialog }: AdminSectionProps) {
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
  
  // 準備PDF文檔並添加基本設置
  const preparePDF = (doc: jsPDF) => {
    try {
      // 使用預設字體
      doc.setFont('helvetica', 'normal');
      
      // 添加頁眉信息
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text('達遠塑膠訂單報表', 15, 10);
      
      // 頁碼
      doc.text('第 1 頁', doc.internal.pageSize.getWidth() - 15, 10, { align: 'right' });
      
      // 產生時間 (英文格式確保兼容性)
      const now = new Date();
      const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      doc.text(`Generated: ${formattedDate}`, doc.internal.pageSize.getWidth() - 15, doc.internal.pageSize.getHeight() - 10, { align: 'right' });
      
      return doc;
    } catch (error) {
      console.error("Error preparing PDF:", error);
      return doc;
    }
  };
  
  // 直接在前端生成CSV功能 - 完全支持中文
  const downloadOrderStatsCSV = () => {
    if (!statsData) {
      // 如果還沒有生成統計數據，則自動調用生成功能
      handleGenerateStats();
      
      // 顯示一個消息通知用戶稍後再試
      toast({
        title: "正在生成數據",
        description: "請等待數據生成完成後再試",
      });
      return;
    }
    
    if (!statsData.stats || statsData.stats.length === 0 || !statsData.orders || statsData.orders.length === 0) {
      toast({
        title: "無法生成報表",
        description: "所選時間段內沒有訂單數據",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // 在前端直接生成CSV內容，避免編碼問題
      // 添加 BOM (Byte Order Mark) 以確保Excel正確識別UTF-8編碼
      const BOM = '\uFEFF';
      let csvContent = BOM + "日期,產品編號,產品顏色,數量(公斤)\n";
      
      // 根據日期對訂單進行排序
      const sortedOrders = [...statsData.orders].sort((a, b) => {
        return new Date(a.delivery_date).getTime() - new Date(b.delivery_date).getTime();
      });
      
      // 添加訂單數據到CSV
      sortedOrders.forEach(order => {
        const date = order.delivery_date.split('T')[0];
        csvContent += `${date},${order.product_code},${order.product_name},${Number(order.quantity).toFixed(2)}\n`;
      });
      
      // 計算總重量
      const totalWeight = sortedOrders.reduce((sum, order) => sum + Number(order.quantity), 0).toFixed(2);
      csvContent += `\n總計,,,${totalWeight}\n`;
      
      // 創建Blob對象
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      
      // 創建URL
      const url = URL.createObjectURL(blob);
      
      // 創建下載連結
      const link = document.createElement('a');
      link.setAttribute('href', url);
      
      // 設置檔案名稱
      const fileName = statsMonth 
        ? `達遠塑膠_銷售清單_${statsYear}_${statsMonth}月.csv` 
        : `達遠塑膠_銷售清單_${statsYear}.csv`;
      
      link.setAttribute('download', fileName);
      
      // 添加到文檔中並觸發點擊
      document.body.appendChild(link);
      link.click();
      
      // 清理
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "銷售報表已下載",
        description: "CSV文件包含完整的中文支持",
      });
    } catch (error) {
      console.error("CSV generation error:", error);
      toast({
        title: "報表生成失敗",
        description: error instanceof Error ? error.message : "未知錯誤",
        variant: "destructive",
      });
    }
  };
  
  // 生成Excel功能 - 原生支持中文
  const downloadOrderStatsExcel = async () => {
    if (!statsData) {
      // 如果還沒有生成統計數據，則自動調用生成功能
      handleGenerateStats();
      
      // 顯示一個消息通知用戶稍後再試
      toast({
        title: "正在生成數據",
        description: "請等待數據生成完成後再試",
      });
      return;
    }
    
    if (!statsData.stats || statsData.stats.length === 0 || !statsData.orders || statsData.orders.length === 0) {
      toast({
        title: "無法生成報表",
        description: "所選時間段內沒有訂單數據",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // 創建一個新的Excel工作簿
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "達遠塑膠銷售系統";
      workbook.created = new Date();
      
      // 添加一個工作表
      const worksheet = workbook.addWorksheet('銷售清單');
      
      // 標題樣式
      const titleStyle = {
        font: { size: 16, bold: true },
        alignment: { horizontal: 'center' as const }
      };
      
      // 完全按照截圖要求設置標題格式
      const titleText = statsMonth 
        ? `達遠塑膠_銷售清單_${statsYear}_${statsMonth}月` 
        : `達遠塑膠_銷售清單_${statsYear}`;
      
      // 合併儲存格建立標題區域
      worksheet.mergeCells('A1:D1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = titleText;
      titleCell.style = {
        font: { size: 16, bold: true },
        alignment: { horizontal: 'center' as const, vertical: 'middle' as const }
      };
      // 調整標題行高
      worksheet.getRow(1).height = 28;
      
      // 設置數量標題
      worksheet.mergeCells('A2:D2');
      const quantityHeaderCell = worksheet.getCell('A2');
      quantityHeaderCell.value = '數量(公斤)';
      quantityHeaderCell.style = {
        font: { size: 14, bold: true },
        alignment: { horizontal: 'center' as const, vertical: 'middle' as const }
      };
      worksheet.getRow(2).height = 24;
      
      // 第三行設置欄位標題
      worksheet.getRow(3).values = ['日期', '產品編號', '產品顏色', '數量(公斤)'];
      worksheet.getRow(3).height = 22;
      worksheet.getRow(3).font = { bold: true, size: 11 };
      worksheet.getRow(3).alignment = { horizontal: 'center' as const, vertical: 'middle' as const };
      
      // 設置列寬
      worksheet.getColumn(1).width = 15;
      worksheet.getColumn(2).width = 15;
      worksheet.getColumn(3).width = 20;
      worksheet.getColumn(4).width = 15;
      
      // 標題行樣式已在上方設置完成
      
      // 為標題欄位添加底色和邊框
      for (let i = 1; i <= 4; i++) {
        // 第三行才是標題行
        const cell = worksheet.getRow(3).getCell(i);
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD3D3D3' } // 淺灰色底色，匹配截圖
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      }
      
      // 表頭樣式已在上方設置，這裡不需重複
      
      // 根據日期對訂單進行排序
      const sortedOrders = [...statsData.orders].sort((a, b) => {
        return new Date(a.delivery_date).getTime() - new Date(b.delivery_date).getTime();
      });
      
      // 添加數據行
      let currentDate = '';
      let rowIndex = 4; // 從第4行開始添加數據 (因為前面有1行標題和2行表頭)
      let dailyTotal = 0;
      
      sortedOrders.forEach((order, index) => {
        const date = order.delivery_date.split('T')[0];
        const quantity = Number(order.quantity);
        
        // 如果是新的一天，並且不是第一筆數據，則添加前一天的小計
        if (currentDate !== '' && currentDate !== date && index > 0) {
          // 添加日期小計行
          const totalRow = worksheet.addRow({
            date: `${currentDate} 小計`,
            code: '',
            name: '',
            quantity: Number(dailyTotal.toFixed(2))
          });
          rowIndex++;
          
          // 設置小計行樣式
          totalRow.font = { bold: true };
          totalRow.getCell(1).alignment = { horizontal: 'left' as const };
          totalRow.getCell(4).alignment = { horizontal: 'right' as const };
          
          // 添加小計行的底部邊框
          for (let i = 1; i <= 4; i++) {
            totalRow.getCell(i).border = {
              bottom: { style: 'thin' }
            };
          }
          
          // 添加空行作為分隔
          worksheet.addRow({});
          rowIndex++;
          
          // 重置日期總計
          dailyTotal = 0;
        }
        
        // 設置當前日期
        currentDate = date;
        
        // 添加訂單數據
        const dataRow = worksheet.addRow({
          date: date,
          code: order.product_code,
          name: order.product_name,
          quantity: Number(quantity.toFixed(2))
        });
        rowIndex++;
        
        // 設置數據行樣式
        dataRow.getCell(1).alignment = { horizontal: 'left' as const };
        dataRow.getCell(4).alignment = { horizontal: 'right' as const };
        
        // 為數據行添加輕微的邊框
        for (let i = 1; i <= 4; i++) {
          dataRow.getCell(i).border = {
            bottom: { style: 'hair' }
          };
        }
        
        // 累加當日總計
        dailyTotal += quantity;
      });
      
      // 添加最後一天的小計
      if (sortedOrders.length > 0) {
        // 添加最後一天小計行
        const lastTotalRow = worksheet.addRow({
          date: `${currentDate} 小計`,
          code: '',
          name: '',
          quantity: Number(dailyTotal.toFixed(2))
        });
        rowIndex++;
        
        // 設置小計行樣式
        lastTotalRow.font = { bold: true };
        lastTotalRow.getCell(1).alignment = { horizontal: 'left' as const };
        lastTotalRow.getCell(4).alignment = { horizontal: 'right' as const };
        
        // 添加小計行的底部邊框
        for (let i = 1; i <= 4; i++) {
          lastTotalRow.getCell(i).border = {
            bottom: { style: 'thin' }
          };
        }
        
        // 添加空行作為分隔
        worksheet.addRow({});
        rowIndex++;
      }
      
      // 添加總計行
      const grandTotal = sortedOrders.reduce((sum, order) => sum + Number(order.quantity), 0);
      
      const grandTotalRow = worksheet.addRow({
        date: '總計',
        code: '',
        name: '',
        quantity: Number(grandTotal.toFixed(2))
      });
      rowIndex++;
      
      // 設置總計行樣式
      grandTotalRow.font = { bold: true, size: 12 };
      grandTotalRow.height = 24;
      grandTotalRow.getCell(1).alignment = { horizontal: 'left' as const };
      grandTotalRow.getCell(4).alignment = { horizontal: 'right' as const };
      
      // 添加總計行的底部和頂部粗邊框
      for (let i = 1; i <= 4; i++) {
        grandTotalRow.getCell(i).border = {
          top: { style: 'medium' },
          bottom: { style: 'double' }
        };
      }
      
      // 設置數字列為數字格式
      worksheet.getColumn(4).numFmt = '0.00';
      
      // 寫入Excel文件並下載
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      
      // 創建下載連結
      const link = document.createElement('a');
      link.href = url;
      
      // 設置檔案名稱
      const fileName = statsMonth 
        ? `達遠塑膠_銷售清單_${statsYear}_${statsMonth}月.xlsx` 
        : `達遠塑膠_銷售清單_${statsYear}.xlsx`;
      
      link.download = fileName;
      
      // 觸發下載
      document.body.appendChild(link);
      link.click();
      
      // 清理
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Excel報表已下載",
        description: "Excel文件包含完整的中文支持與格式化",
      });
    } catch (error) {
      console.error("Excel generation error:", error);
      toast({
        title: "Excel報表生成失敗",
        description: error instanceof Error ? error.message : "未知錯誤",
        variant: "destructive",
      });
    }
  };

  // 簡化版PDF報表生成
  const generateOrderStatsPDF = () => {
    if (!statsData || !statsData.orders || statsData.orders.length === 0) {
      toast({
        title: "無法生成PDF",
        description: "所選時間段內沒有訂單數據",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // 創建PDF文檔
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // 使用基本英文字體
      doc.setFont('helvetica', 'normal');
      
      // 設置標題
      doc.setFontSize(18);
      doc.setTextColor(0, 51, 102);
      doc.text("達遠塑膠銷售報表", doc.internal.pageSize.getWidth() / 2, 15, { align: "center" });
      
      // 報表期間
      const reportPeriod = statsData.periodText || `${statsYear}年${statsMonth ? statsMonth + '月' : '全年'}`;
      
      // 添加報表資訊
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      doc.text(`報表期間: ${reportPeriod}`, 15, 25);
      doc.text(`訂單總數: ${statsData.totalOrders} 筆`, 15, 30);
      doc.text(`總公斤數: ${statsData.totalKilograms.toFixed(2)} kg`, 15, 35);
      
      // 列印時間
      const now = new Date();
      const printDate = `${now.getFullYear()}/${(now.getMonth()+1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')}`;
      doc.text(`列印日期: ${printDate}`, 15, 40);
      
      // 使用簡單表格
      const headers = ['日期', '產品編號', '產品顏色', '數量(kg)'];
      
      // 準備數據 - 按日期排序
      const sortedOrders = [...statsData.orders].sort((a, b) => {
        return new Date(a.delivery_date).getTime() - new Date(b.delivery_date).getTime();
      });
      
      // 轉換為表格數據格式
      const tableData = sortedOrders.map(order => {
        const date = order.delivery_date.split('T')[0];
        return [date, order.product_code, order.product_name, Number(order.quantity).toFixed(2)];
      });
      
      // 使用autoTable插件
      autoTable(doc, {
        startY: 45,
        head: [headers],
        body: tableData,
        theme: 'striped',
        styles: {
          fontSize: 9,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: [255, 255, 255],
          fontSize: 10
        },
        columnStyles: {
          0: { cellWidth: 25 }, // 日期
          1: { cellWidth: 30 }, // 產品編號
          2: { cellWidth: 'auto' }, // 產品顏色
          3: { cellWidth: 25, halign: 'right' } // 數量
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        margin: { top: 45, left: 15, right: 15, bottom: 15 },
      });
      
      // 添加總計行
      const finalY = (doc as any).lastAutoTable.finalY || 50;
      doc.setFillColor(230, 230, 230);
      doc.rect(15, finalY, doc.internal.pageSize.getWidth() - 30, 7, 'F');
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.text("總計", 20, finalY + 5);
      
      const totalQuantity = statsData.totalKilograms || sortedOrders.reduce((sum, order) => sum + Number(order.quantity), 0);
      doc.text(`${totalQuantity.toFixed(2)} kg`, doc.internal.pageSize.getWidth() - 20, finalY + 5, { align: 'right' });
      
      // 生成並下載PDF
      let fileName = statsMonth 
        ? `達遠塑膠_銷售報表_${statsYear}年${statsMonth}月.pdf` 
        : `達遠塑膠_銷售報表_${statsYear}年.pdf`;
      
      doc.save(fileName);
      
      toast({
        title: "PDF報表已下載",
        description: "銷售報表已成功生成",
      });
    } catch (error) {
      console.error("PDF生成錯誤:", error);
      toast({
        title: "PDF生成失敗",
        description: error instanceof Error ? error.message : "未知錯誤",
        variant: "destructive",
      });
    }
  };

  // 使用当前日期作为默认日期范围，只在第一次显示时设置
  useEffect(() => {
    if (isVisible) {
      // 只在首次显示且没有设置日期时，设置默认日期范围为当前月
      if (!startDate || !endDate) {
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        const formatDate = (date: Date) => {
          return date.toISOString().split('T')[0]; // 格式化为 YYYY-MM-DD
        };
        
        setStartDate(formatDate(firstDayOfMonth));
        setEndDate(formatDate(lastDayOfMonth));
        
        // 不在这里加载历史订单，让第二个useEffect来处理
      }
    }
  }, [isVisible, startDate, endDate]);
  
  // 监听日期变化加载历史订单
  useEffect(() => {
    // 只有在有真正的日期值变更时才加载历史订单，避免无限循环
    if (isVisible && activeTab === "history" && startDate && endDate) {
      // 添加防抖，避免频繁请求
      const timer = setTimeout(() => {
        loadHistory(startDate, endDate);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [isVisible, activeTab, startDate, endDate]);
  
  // 监听订单完成事件，当临时订单被标记为完成时自动刷新历史订单
  useEffect(() => {
    const handleOrderCompleted = () => {
      console.log('订单完成事件接收，刷新历史订单');
      if (isVisible && activeTab === "history" && startDate && endDate) {
        // 添加防抖，避免短时间内多次触发
        setTimeout(() => {
          loadHistory(startDate, endDate);
        }, 300);
      }
    };
    
    // 添加事件监听器
    window.addEventListener('orderCompleted', handleOrderCompleted);
    
    // 清理函数
    return () => {
      window.removeEventListener('orderCompleted', handleOrderCompleted);
    };
  }, [isVisible, activeTab, startDate, endDate]);

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
            activeTab === "product_popularity" 
              ? "active bg-white border border-[#ccc] border-b-0" 
              : "bg-[#ddd]"
          }`}
          onClick={() => setActiveTab("product_popularity")}
        >
          產品熱銷度
        </div>
        <div 
          className={`px-5 py-2.5 text-[20px] cursor-pointer rounded-t-lg mr-1 ${
            activeTab === "order_stats" 
              ? "active bg-white border border-[#ccc] border-b-0" 
              : "bg-[#ddd]"
          }`}
          onClick={() => setActiveTab("order_stats")}
        >
          訂單統計
        </div>
        <div 
          className={`px-5 py-2.5 text-[20px] cursor-pointer rounded-t-lg mr-1 ${
            activeTab === "config" 
              ? "active bg-white border border-[#ccc] border-b-0" 
              : "bg-[#ddd]"
          }`}
          onClick={() => setActiveTab("config")}
        >
          系統設定
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
                <div className="text-[24px] mb-4 font-bold flex items-center">
                  <span>到貨日期: {new Date(date).toLocaleDateString("zh-TW")}</span>
                  {(() => {
                    // 計算當日總公斤數
                    let totalKilograms = 0;
                    
                    // 遍歷該日期的所有訂單並累加數量
                    historyOrders[date].forEach(order => {
                      // 將字符串數量轉換為數字
                      const orderQuantity = Number(order.quantity);
                      if (!isNaN(orderQuantity)) {
                        totalKilograms += orderQuantity;
                      }
                    });
                    
                    // 計算包數（除以25並無條件進位）
                    const totalPackages = Math.ceil(totalKilograms / 25);
                    
                    return (
                      <span className="ml-auto text-[20px] text-indigo-700 font-medium">
                        總公斤數: {totalKilograms} kg（{totalPackages} 包）
                      </span>
                    );
                  })()}
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
                            ? new Date(order.completed_at).toLocaleDateString("zh-TW") 
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
      
      {/* 產品熱銷度 Tab */}
      <div 
        className={`p-5 bg-white border border-[#ccc] rounded-b-lg rounded-tr-lg ${
          activeTab === "product_popularity" ? "block" : "hidden"
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
                <span className="ml-4 text-indigo-700">
                  （總計: {statsData.totalKilograms || 0} 公斤）
                </span>
              </div>
              <table className="w-full border-collapse mt-2.5">
                <thead>
                  <tr>
                    <th className="p-3 text-left bg-[#f8f8f8] text-gray-800 border-b-2 border-[#ddd]">產品編號</th>
                    <th className="p-3 text-left bg-[#f8f8f8] text-gray-800 border-b-2 border-[#ddd]">產品名稱</th>
                    <th className="p-3 text-left bg-[#f8f8f8] text-gray-800 border-b-2 border-[#ddd]">訂單數量</th>
                    <th className="p-3 text-left bg-[#f8f8f8] text-gray-800 border-b-2 border-[#ddd]">總公斤數</th>
                    <th className="p-3 text-left bg-[#f8f8f8] text-gray-800 border-b-2 border-[#ddd]">銷售熱度比例</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    // 计算总销售量作为比例基准
                    const totalQuantity = statsData.stats.reduce((sum, stat) => sum + stat.totalQuantity, 0);
                    
                    // 按销售量排序，销量高的排在前面
                    const sortedStats = [...statsData.stats].sort((a, b) => b.totalQuantity - a.totalQuantity);
                    
                    return sortedStats.map((stat) => {
                      // 计算百分比和热度显示
                      const percentage = totalQuantity > 0 ? (stat.totalQuantity / totalQuantity) * 100 : 0;
                      
                      // 根据百分比确定热度颜色
                      let heatColor = "";
                      if (percentage >= 25) {
                        heatColor = "bg-red-600"; // 热销商品 (>= 25%)
                      } else if (percentage >= 15) {
                        heatColor = "bg-orange-500"; // 较热销商品 (15-25%)
                      } else if (percentage >= 5) {
                        heatColor = "bg-yellow-400"; // 一般热销商品 (5-15%)
                      } else {
                        heatColor = "bg-blue-500"; // 低热度商品 (< 5%)
                      }
                      
                      return (
                        <tr key={stat.code}>
                          <td className="p-3 border-b border-[#eee]">{stat.code}</td>
                          <td className="p-3 border-b border-[#eee]">{stat.name}</td>
                          <td className="p-3 border-b border-[#eee]">{stat.orderCount}</td>
                          <td className="p-3 border-b border-[#eee]">{stat.totalQuantity.toFixed(2)}</td>
                          <td className="p-3 border-b border-[#eee]">
                            <div className="flex items-center">
                              <div className="w-24 bg-gray-200 rounded-full h-2.5 mr-2">
                                <div 
                                  className={`${heatColor} h-2.5 rounded-full`} 
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                              <span className="text-sm text-gray-700">{percentage.toFixed(1)}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
              <div className="mt-4 text-gray-600">總計: {statsData.totalOrders} 筆訂單</div>
              
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
          </div>
          
          <div className="flex items-center flex-wrap gap-2">
            <Button
              onClick={handleGenerateStats}
              className="box-border h-10 px-5 text-[20px] bg-[#4CAF50] text-white border-none rounded cursor-pointer hover:bg-[#45a049]"
            >
              生成統計
            </Button>
            
            <Button
              onClick={generateOrderStatsPDF}
              className="box-border h-10 px-5 text-[20px] bg-[#2196F3] text-white border-none rounded cursor-pointer hover:bg-[#0b7dda]"
            >
              下載PDF
            </Button>
            
            <Button
              onClick={downloadOrderStatsCSV}
              className="box-border h-10 px-5 text-[20px] bg-[#FF9800] text-white border-none rounded cursor-pointer hover:bg-[#e68a00]"
            >
              下載CSV
            </Button>
            
            <Button
              onClick={() => downloadOrderStatsExcel()}
              className="box-border h-10 px-5 text-[20px] bg-[#9C27B0] text-white border-none rounded cursor-pointer hover:bg-[#7B1FA2]"
            >
              下載Excel
            </Button>
          </div>
          
          <div className="w-full mt-2 text-sm text-gray-500">
            已添加Excel與CSV匯出功能，完整支持中文字符顯示
          </div>
        </div>
        
        {isLoadingStats && (
          <div className="flex justify-center p-10">
            <div className="w-16 h-16 border-4 border-t-4 border-[#3498db] rounded-full animate-spin"></div>
          </div>
        )}
        
        {!isLoadingStats && statsData && statsData.orders && (
          <div className="bg-white rounded shadow-md p-5">
            <h2 className="text-[28px] text-center mb-4">訂單統計 - {statsData.periodText}</h2>
            
            {Object.entries(groupByDate(statsData.orders)).length === 0 ? (
              <p className="text-center text-[20px] my-10">無訂單數據</p>
            ) : (
              <div>
                {Object.entries(groupByDate(statsData.orders)).map(([date, orders]) => {
                  // 計算這一天的總數量
                  const dailyTotal = orders.reduce((sum, order) => sum + Number(order.quantity), 0);
                  
                  return (
                    <div key={date} className="mb-6 border-b pb-4">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-[22px] font-bold">日期: {date}</h3>
                        <div className="text-lg font-medium">
                          總數: <span className="font-bold">{dailyTotal.toFixed(2)}</span> 公斤
                        </div>
                      </div>
                      <table className="w-full border-collapse text-lg">
                        <thead>
                          <tr className="bg-[#f2f2f2]">
                            <th className="p-3 text-left border-b border-[#ddd]">產品編號</th>
                            <th className="p-3 text-left border-b border-[#ddd]">產品顏色</th>
                            <th className="p-3 text-left border-b border-[#ddd]">數量 (公斤)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.map((order, idx) => (
                            <tr key={`${order.id}-${idx}`} className="hover:bg-[#f5f5f5]">
                              <td className="p-3 border-b border-[#ddd]">{order.product_code}</td>
                              <td className="p-3 border-b border-[#ddd]">{order.product_name}</td>
                              <td className="p-3 border-b border-[#ddd]">{Number(order.quantity).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
                <div className="mt-4 text-right">
                  <p className="text-[20px]">
                    總訂單數: <span className="font-bold">{statsData.totalOrders}</span>
                  </p>
                  <p className="text-[22px]">
                    總公斤數: <span className="font-bold">{statsData.totalKilograms.toFixed(2)}</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Config Tab */}
      <div 
        className={`p-5 bg-white border border-[#ccc] rounded-b-lg rounded-tr-lg ${
          activeTab === "config" ? "block" : "hidden"
        }`}
      >
        <ConfigSettings />
      </div>
    </div>
  );
}
