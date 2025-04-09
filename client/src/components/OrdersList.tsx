import { useState, useEffect } from "react";
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
  const [isEditDialogOpen, setIsEditDialogOpen] = useState<boolean>(false);
  
  const { 
    orders, 
    isLoadingOrders, 
    loadOrders, 
    deleteOrder, 
    completeOrder,
    updateTemporaryOrder
  } = useOrders();
  
  const { isAdmin } = useAdmin();
  const { toast } = useToast();

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

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
  
  const handleEditOrder = (order: Order) => {
    setEditingOrder(order);
    setEditQuantity(order.quantity.toString());
    setIsEditDialogOpen(true);
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
      
      await updateTemporaryOrder(editingOrder.id, quantity);
      setIsEditDialogOpen(false);
      
      toast({
        title: "編輯成功",
        description: "訂單數量已成功更新",
      });
      
      // 重新加载订单列表
      loadOrders();
    } catch (error) {
      console.error("Edit order error:", error);
      toast({
        title: "編輯失敗",
        description: "無法更新訂單數量",
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
          onClick={loadOrders}
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
          Object.keys(orders).sort().map((date) => (
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
                    <th className="border border-[#ddd] p-3 bg-[#f2f2f2] text-left">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {orders[date].map((order) => (
                    <tr key={order.id}>
                      <td className="border border-[#ddd] p-3">{order.product_code}</td>
                      <td className="border border-[#ddd] p-3">{order.product_name}</td>
                      <td className="border border-[#ddd] p-3">{order.quantity}</td>
                      <td className="border border-[#ddd] p-3">
                        <Button
                          className="px-2.5 py-1 text-base bg-[#2196F3] text-white border-none rounded cursor-pointer hover:bg-[#0b7dda] mr-2"
                          onClick={() => handleEditOrder(order)}
                        >
                          編輯
                        </Button>
                        <Button
                          className="px-2.5 py-1 text-base bg-[#f44336] text-white border-none rounded cursor-pointer hover:bg-[#d32f2f]"
                          onClick={() => handleDeleteOrder(order.id)}
                        >
                          刪除
                        </Button>
                        {isAdmin && (
                          <Button
                            className="px-2.5 py-1 text-base bg-[#4CAF50] text-white border-none rounded cursor-pointer ml-2 hover:bg-[#45a049]"
                            onClick={() => handleCompleteOrder(order.id)}
                          >
                            完成訂單
                          </Button>
                        )}
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
  );
}
