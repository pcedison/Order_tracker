import { useState, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Order, GroupedOrders, StatItem } from "@/lib/types";

interface CreateOrderParams {
  delivery_date: string;
  product_code: string;
  product_name: string;
  quantity: number;
  status: "temporary" | "completed";
}

interface StatsData {
  stats: StatItem[];
  periodText: string;
  totalOrders: number;
  totalKilograms: number; // 新增總公斤數字段
}

export function useOrders() {
  const [orders, setOrders] = useState<GroupedOrders>({});
  const [historyOrders, setHistoryOrders] = useState<GroupedOrders>({});
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  
  const { toast } = useToast();

  // Load current temporary orders
  const loadOrders = useCallback(async () => {
    setIsLoadingOrders(true);
    try {
      const response = await fetch('/api/orders?status=temporary');
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Group orders by delivery date
      const groupedOrders: GroupedOrders = {};
      data.forEach((order: Order) => {
        if (!groupedOrders[order.delivery_date]) {
          groupedOrders[order.delivery_date] = [];
        }
        groupedOrders[order.delivery_date].push(order);
      });
      
      setOrders(groupedOrders);
    } catch (error) {
      console.error("Load orders error:", error);
      toast({
        title: "訂單載入失敗",
        description: error instanceof Error ? error.message : "未知錯誤",
        variant: "destructive",
      });
    } finally {
      setIsLoadingOrders(false);
    }
  }, [toast]);

  // Create a new order
  const createOrder = async (orderData: CreateOrderParams) => {
    try {
      const response = await apiRequest('POST', '/api/orders', orderData);
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      // Reload orders after creating a new one
      await loadOrders();
      return true;
    } catch (error) {
      console.error("Create order error:", error);
      throw error;
    }
  };

  // Delete an order
  const deleteOrder = async (orderId: string) => {
    try {
      const response = await apiRequest('DELETE', `/api/orders/${orderId}`);
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      toast({
        title: "訂單已刪除",
        description: "訂單已成功刪除",
      });
      
      // Reload orders after deletion
      await loadOrders();
      return true;
    } catch (error) {
      console.error("Delete order error:", error);
      toast({
        title: "訂單刪除失敗",
        description: error instanceof Error ? error.message : "未知錯誤",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Complete an order (change status from temporary to completed)
  const completeOrder = async (orderId: string) => {
    try {
      const response = await apiRequest('PATCH', `/api/orders/${orderId}/complete`, {});
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      toast({
        title: "訂單已完成",
        description: "訂單已成功標記為完成",
      });
      
      // Reload orders after completion
      await loadOrders();
      
      // 发送自定义事件，通知其他组件订单已完成
      const orderCompletedEvent = new CustomEvent('orderCompleted', {
        detail: { orderId, timestamp: new Date().toISOString() }
      });
      window.dispatchEvent(orderCompletedEvent);
      
      // 不再在这里加载历史订单，而是让监听事件的 AdminSection 组件负责刷新
      // 避免重复加载和不必要的网络请求
      
      return true;
    } catch (error) {
      console.error("Complete order error:", error);
      toast({
        title: "訂單完成失敗",
        description: error instanceof Error ? error.message : "未知錯誤",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Load historical orders (completed orders)
  const loadHistory = useCallback(async (startDate: string, endDate: string) => {
    if (!startDate || !endDate) {
      return;
    }
    
    // 如果已经在加载中，避免重复请求
    if (isLoadingHistory) return;
    
    setIsLoadingHistory(true);
    try {
      const response = await fetch(
        `/api/orders/history?startDate=${startDate}&endDate=${endDate}`
      );
      
      if (!response.ok) {
        // 检查是否是会话过期/未授权
        if (response.status === 403) {
          // 会话可能已过期，触发重新登录提示
          toast({
            title: "會話已過期",
            description: "請重新登入以查看歷史訂單",
            variant: "destructive",
          });
          // 触发会话过期事件
          window.dispatchEvent(new CustomEvent('sessionExpired'));
          return;
        }
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Group orders by delivery date
      const groupedOrders: GroupedOrders = {};
      data.forEach((order: Order) => {
        if (!groupedOrders[order.delivery_date]) {
          groupedOrders[order.delivery_date] = [];
        }
        groupedOrders[order.delivery_date].push(order);
      });
      
      setHistoryOrders(groupedOrders);
    } catch (error) {
      console.error("Load history error:", error);
      toast({
        title: "歷史訂單載入失敗",
        description: error instanceof Error ? error.message : "未知錯誤",
        variant: "destructive",
      });
    } finally {
      setIsLoadingHistory(false);
    }
  }, [toast, isLoadingHistory]);

  // Generate statistics for completed orders
  const generateStats = useCallback(async (year: string, month: string = "") => {
    // 避免重复请求
    if (isLoadingStats) return;
    
    setIsLoadingStats(true);
    try {
      const response = await fetch(
        `/api/orders/stats?year=${year}${month ? `&month=${month}` : ""}`
      );
      
      if (!response.ok) {
        // 检查是否是会话过期/未授权
        if (response.status === 403) {
          // 会话可能已过期，触发重新登录提示
          toast({
            title: "會話已過期",
            description: "請重新登入以生成統計數據",
            variant: "destructive",
          });
          // 触发会话过期事件
          window.dispatchEvent(new CustomEvent('sessionExpired'));
          return;
        }
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setStatsData(data);
    } catch (error) {
      console.error("Generate stats error:", error);
      toast({
        title: "統計生成失敗",
        description: error instanceof Error ? error.message : "未知錯誤",
        variant: "destructive",
      });
    } finally {
      setIsLoadingStats(false);
    }
  }, [toast, isLoadingStats]);

  // Edit history order (Update quantity)
  const editHistoryOrder = async (orderId: string, productCode: string, quantity: number) => {
    try {
      const response = await apiRequest('PATCH', `/api/orders/history/${orderId}`, {
        product_code: productCode,
        quantity
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      return true;
    } catch (error) {
      console.error("Edit history order error:", error);
      throw error;
    }
  };
  
  // Delete history order
  const deleteHistoryOrder = async (orderId: string, productCode: string) => {
    try {
      const response = await apiRequest('DELETE', `/api/orders/history/${orderId}`, {
        product_code: productCode
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      return true;
    } catch (error) {
      console.error("Delete history order error:", error);
      throw error;
    }
  };
  
  // Update temporary order (edit quantity and/or delivery date)
  const updateTemporaryOrder = async (orderId: string, quantity: number, delivery_date?: string) => {
    try {
      const updateData: { quantity: number; delivery_date?: string } = { quantity };
      
      // 只有在传入日期时才更新日期
      if (delivery_date) {
        updateData.delivery_date = delivery_date;
      }
      
      const response = await apiRequest('PATCH', `/api/orders/${orderId}`, updateData);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      return true;
    } catch (error) {
      console.error("Update temporary order error:", error);
      throw error;
    }
  };

  return {
    orders,
    historyOrders,
    statsData,
    isLoadingOrders,
    isLoadingHistory,
    isLoadingStats,
    loadOrders,
    createOrder,
    deleteOrder,
    completeOrder,
    loadHistory,
    generateStats,
    editHistoryOrder,
    deleteHistoryOrder,
    updateTemporaryOrder,
  };
}
