import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useOrders } from "@/hooks/useOrders";
import { useAdmin } from "@/hooks/useAdmin";

interface OrdersListProps {
  showConfirmDialog: (message: string, onConfirm: () => void) => void;
}

export default function OrdersList({ showConfirmDialog }: OrdersListProps) {
  const { 
    orders, 
    isLoadingOrders, 
    loadOrders, 
    deleteOrder, 
    completeOrder 
  } = useOrders();
  
  const { isAdmin } = useAdmin();

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

  return (
    <div>
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
