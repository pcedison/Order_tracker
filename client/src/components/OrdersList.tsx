import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOrders } from "@/hooks/useOrders";
import { useAdmin } from "@/hooks/useAdmin";
import { useToast } from "@/hooks/use-toast";
import { Order } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface OrdersListProps {
  showConfirmDialog: (message: string, onConfirm: () => void) => void;
}

export default function OrdersList({ showConfirmDialog }: OrdersListProps) {
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editQuantity, setEditQuantity] = useState<string>("");
  const [editDeliveryDate, setEditDeliveryDate] = useState<string>("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState<boolean>(false);
  // 添加本地管理员状态以便触发重渲染
  const [localAdminState, setLocalAdminState] = useState<boolean>(false);
  
  const { 
    orders, 
    isLoadingOrders, 
    loadOrders, 
    deleteOrder, 
    completeOrder,
    updateTemporaryOrder
  } = useOrders();
  
  const { isAdmin, checkAdminStatus } = useAdmin();
  const { toast } = useToast();

  // 处理管理员状态变化的回调
  const handleAdminStatusChanged = useCallback(async (event: Event) => {
    const customEvent = event as CustomEvent;
    console.log('Admin status changed:', customEvent.detail);
    // 更新本地状态以触发重渲染
    setLocalAdminState(customEvent.detail?.isAdmin || false);
    // 重新加载订单
    await loadOrders();
  }, [loadOrders]);

  // isAdmin 狀態變化時僅更新本地狀態，不觸發其他操作
  useEffect(() => {
    setLocalAdminState(isAdmin);
  }, [isAdmin]);

  // 獨立的初始化效果，只在組件首次渲染時執行一次
  useEffect(() => {
    // 初始化時只加載一次訂單
    const initializeComponent = async () => {
      await loadOrders(true);
      const status = await checkAdminStatus();
      setLocalAdminState(status);
    };
    
    initializeComponent();
  }, []); // 空依賴陣列確保只執行一次
  
  // 事件監聽器設置，移除依賴項避免重複添加
  useEffect(() => {
    console.log('Setting up event listeners (once)');
    
    // 添加管理员登录成功事件监听器
    const handleAdminLogin = () => {
      console.log('Admin login success event received');
      // 防止頻繁重複請求
      const now = Date.now();
      const lastRefresh = parseInt(sessionStorage.getItem('last_manual_refresh') || '0', 10);
      
      if (now - lastRefresh > 2000) {
        sessionStorage.setItem('last_manual_refresh', now.toString());
        loadOrders(true);
      }
    };
    
    // 添加订单创建成功事件监听器
    const handleOrderCreated = () => {
      console.log('Order created event received');
      // 防止頻繁重複請求
      const now = Date.now();
      const lastRefresh = parseInt(sessionStorage.getItem('last_order_refresh') || '0', 10);
      
      if (now - lastRefresh > 2000) {
        sessionStorage.setItem('last_order_refresh', now.toString());
        loadOrders(true);
      }
    };
    
    // 創建一個不依賴於外部變量的事件處理器 (closure)
    const adminStatusHandler = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('Admin status changed (from event):', customEvent.detail);
      
      // 直接更新本地管理員狀態
      if (customEvent.detail && typeof customEvent.detail.isAdmin !== 'undefined') {
        setLocalAdminState(customEvent.detail.isAdmin);
      }
    };
    
    window.addEventListener('adminLoginSuccess', handleAdminLogin);
    window.addEventListener('orderCreated', handleOrderCreated);
    window.addEventListener('adminStatusChanged', adminStatusHandler);
    
    // 清理函数
    return () => {
      window.removeEventListener('adminLoginSuccess', handleAdminLogin);
      window.removeEventListener('orderCreated', handleOrderCreated);
      window.removeEventListener('adminStatusChanged', adminStatusHandler);
    };
  }, []);

  const handleDeleteOrder = (orderId: string) => {
    showConfirmDialog("確定要刪除此訂單嗎？", async () => {
      try {
        await deleteOrder(orderId);
      } catch (error) {
        console.error("Delete order error:", error);
      }
    });
  };

  const handleCompleteOrder = (orderId: string) => {
    showConfirmDialog("確定要將此訂單標記為已完成嗎？", async () => {
      try {
        await completeOrder(orderId);
      } catch (error) {
        console.error("Complete order error:", error);
      }
    });
  };
  
  const handleCompleteDateOrders = (date: string, dateOrders: Order[]) => {
    showConfirmDialog(`確定要將 ${new Date(date).toLocaleDateString("zh-TW")} 的所有訂單標記為已完成嗎？`, async () => {
      try {
        // 逐个完成该日期的所有订单
        for (const order of dateOrders) {
          await completeOrder(order.id);
        }
        
        toast({
          title: "批量完成成功",
          description: "所有訂單已成功標記為完成",
        });
        
        // 在所有订单完成后，再次触发一个批量完成事件，确保历史订单页面被刷新
        const batchOrderCompletedEvent = new CustomEvent('orderCompleted', {
          detail: { 
            isBatch: true, 
            date, 
            count: dateOrders.length,
            timestamp: new Date().toISOString() 
          }
        });
        window.dispatchEvent(batchOrderCompletedEvent);
      } catch (error) {
        console.error("Complete date orders error:", error);
        toast({
          title: "處理失敗",
          description: "無法完成部分或全部訂單",
          variant: "destructive",
        });
      }
    });
  };
  
  const handleEditOrder = (order: Order) => {
    setEditingOrder(order);
    setEditQuantity(order.quantity.toString());
    setEditDeliveryDate(order.delivery_date);
    setIsEditDialogOpen(true);
  };
  
  const handleSaveEdit = async () => {
    if (!editingOrder) return;
    
    try {
      // 验证数量
      const quantity = parseInt(editQuantity);
      if (isNaN(quantity) || quantity <= 0) {
        toast({
          title: "數量無效",
          description: "請輸入有效的數量（必須大於0）",
          variant: "destructive",
        });
        return;
      }
      
      // 验证日期格式是否有效
      if (!editDeliveryDate || !editDeliveryDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        toast({
          title: "日期格式無效",
          description: "請選擇有效的日期",
          variant: "destructive",
        });
        return;
      }
      
      // 更新订单的数量和日期
      await updateTemporaryOrder(editingOrder.id, quantity, editDeliveryDate);
      setIsEditDialogOpen(false);
      
      toast({
        title: "編輯成功",
        description: "訂單資訊已成功更新",
      });
      
      // 重新加载订单列表
      loadOrders();
    } catch (error) {
      console.error("Edit order error:", error);
      toast({
        title: "編輯失敗",
        description: "無法更新訂單資訊",
        variant: "destructive",
      });
    }
  };

  return (
    <div>
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
                  <div className="text-right text-[18px] font-medium">到貨日期:</div>
                  <Input
                    id="deliveryDate"
                    type="date"
                    value={editDeliveryDate}
                    onChange={(e) => setEditDeliveryDate(e.target.value)}
                    className="col-span-3 text-[18px] p-2 border border-[#ccc] rounded"
                  />
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
      
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[26px] inline-block">已成立的訂單</h2>
        <Button
          id="refreshOrdersBtn"
          onClick={(e) => {
            e.preventDefault();
            loadOrders(true);
          }}
          className="px-4 py-2.5 text-[22px] bg-[#607d8b] text-white border-none rounded cursor-pointer hover:bg-opacity-90"
        >
          刷新訂單
        </Button>
      </div>
      
      <div id="ordersContainer" className="mt-2">
        {isLoadingOrders ? (
          <div className="text-center py-5 text-[22px] text-gray-600">正在載入訂單資料...</div>
        ) : Object.keys(orders).length === 0 ? (
          <div className="text-center py-5 text-[22px] text-gray-600">目前沒有待處理的訂單</div>
        ) : (
          Object.keys(orders).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()).map((date) => (
            <div key={date} className="mb-8 border border-neutral-dark rounded-lg p-5">
              <div className="flex justify-between items-center mb-4">
                <div className="text-[24px] font-bold flex items-center flex-wrap">
                  <span>到貨日期: {new Date(date).toLocaleDateString("zh-TW")}</span>
                  {(() => {
                    // 計算當日總公斤數
                    let totalKilograms = 0;
                    
                    // 遍歷該日期的所有訂單並累加數量
                    orders[date].forEach(order => {
                      // 將字符串數量轉換為數字
                      const orderQuantity = Number(order.quantity);
                      if (!isNaN(orderQuantity)) {
                        totalKilograms += orderQuantity;
                      }
                    });
                    
                    // 計算包數（除以25並無條件進位）
                    const totalPackages = Math.ceil(totalKilograms / 25);
                    
                    return (
                      <span className="ml-4 text-[20px] text-indigo-700 font-medium">
                        總公斤數: {totalKilograms} kg（{totalPackages} 包）
                      </span>
                    );
                  })()}
                </div>
                {(isAdmin || localAdminState) && (
                  <Button
                    className="px-4 py-2 text-[18px] bg-[#4CAF50] text-white border-none rounded cursor-pointer hover:bg-[#45a049] ml-2"
                    onClick={() => handleCompleteDateOrders(date, orders[date])}
                  >
                    完成此日期所有訂單
                  </Button>
                )}
              </div>
              <table className="w-full border-collapse text-[22px]">
                <thead>
                  <tr>
                    <th className="border border-[#ddd] p-3 bg-[#f2f2f2] text-left">產品編號</th>
                    <th className="border border-[#ddd] p-3 bg-[#f2f2f2] text-left">產品名稱</th>
                    <th className="border border-[#ddd] p-3 bg-[#f2f2f2] text-left">數量 (公斤)</th>
                    {(isAdmin || localAdminState) && (
                      <th className="border border-[#ddd] p-3 bg-[#f2f2f2] text-left">操作</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {orders[date].map((order) => (
                    <tr key={order.id}>
                      <td className="border border-[#ddd] p-3">{order.product_code}</td>
                      <td className="border border-[#ddd] p-3">{order.product_name}</td>
                      <td className="border border-[#ddd] p-3">{order.quantity}</td>
                      {(isAdmin || localAdminState) && (
                        <td className="border border-[#ddd] p-3">
                          <div className="flex w-[160px]">
                            <Button
                              onClick={() => handleEditOrder(order)}
                              className="text-xs py-1 px-3 bg-[#2196F3] text-white hover:bg-[#0b7dda] w-16 mr-2 rounded-md h-10"
                            >
                              編輯
                            </Button>
                            <Button
                              onClick={() => handleDeleteOrder(order.id)}
                              className="text-xs py-1 px-3 bg-[#f44336] text-white hover:bg-[#d32f2f] w-16 rounded-md h-10"
                            >
                              刪除
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
