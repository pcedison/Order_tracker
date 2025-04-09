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
      
      // 如果在管理員頁面，也重新加載歷史訂單
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      const startDate = firstDay.toISOString().split('T')[0];
      const endDate = lastDay.toISOString().split('T')[0];
      await loadHistory(startDate, endDate);
      
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
    
    setIsLoadingHistory(true);
    try {
      const response = await fetch(
        `/api/orders/history?startDate=${startDate}&endDate=${endDate}`
      );
      
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
  }, [toast]);

  // Generate statistics for completed orders
  const generateStats = useCallback(async (year: string, month: string = "") => {
    setIsLoadingStats(true);
    try {
      const response = await fetch(
        `/api/orders/stats?year=${year}${month ? `&month=${month}` : ""}`
      );
      
      if (!response.ok) {
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
  }, [toast]);

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
  
  // Update temporary order (edit quantity)
  const updateTemporaryOrder = async (orderId: string, quantity: number) => {
    try {
      const response = await apiRequest('PATCH', `/api/orders/${orderId}`, {
        quantity
      });
      
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
