import { type Order, type InsertOrder } from "@shared/schema";
import { nanoid } from "nanoid";
import { supabase } from "./supabase";

// Define types for statistics
interface StatItem {
  code: string;
  name: string;
  totalQuantity: number;
  orderCount: number;
}

interface OrderStats {
  stats: StatItem[];
  periodText: string;
  totalOrders: number;
}

export interface IStorage {
  getOrders(status?: "temporary" | "completed"): Promise<Order[]>;
  getOrdersByDateRange(startDate: string, endDate: string, status?: "temporary" | "completed"): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  deleteOrder(id: string): Promise<void>;
  completeOrder(id: string): Promise<Order>;
  generateOrderStats(year: string, month?: string): Promise<OrderStats>;
}

export class SupabaseStorage implements IStorage {
  private tableName = 'temp_orders'; // 使用与原 HTML 文件相同的表名
  
  async getOrders(status?: "temporary" | "completed"): Promise<Order[]> {
    let query = supabase
      .from(this.tableName)
      .select('*');
    
    // 由于原始表可能没有 status 字段，我们不在查询中使用它
    // 而是在后处理中根据 completed_at 字段推断状态
    
    // Order by created_at in descending order
    query = query.order('created_at', { ascending: false });
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }
    
    // 转换 Supabase 格式到应用期望的格式
    // 通过 completed_at 字段判断订单状态
    let orders = data.map(item => ({
      id: item.item_id || item.id, // 兼容原始 HTML 文件中的 item_id 字段
      delivery_date: item.order_date || item.delivery_date, // 兼容 order_date 字段
      product_code: item.product_code,
      product_name: item.product_name,
      quantity: item.quantity.toString(), // 确保是字符串类型
      status: item.completed_at ? "completed" : "temporary",
      created_at: item.created_at,
      completed_at: item.completed_at
    }));
    
    // 如果请求了特定状态的订单，则在内存中筛选
    if (status) {
      orders = orders.filter(order => order.status === status);
    }
    
    return orders;
  }

  async getOrdersByDateRange(startDate: string, endDate: string, status?: "temporary" | "completed"): Promise<Order[]> {
    let query = supabase
      .from(this.tableName)
      .select('*')
      .gte('order_date', startDate)  // 使用原始字段名 order_date 而不是 delivery_date
      .lte('order_date', endDate);
    
    // 由于原始表可能没有 status 字段，我们不在查询中使用它
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching orders by date range:', error);
      throw error;
    }
    
    // 转换 Supabase 格式到应用期望的格式
    // 通过 completed_at 字段判断订单状态
    let orders = data.map(item => ({
      id: item.item_id || item.id,
      delivery_date: item.order_date || item.delivery_date,
      product_code: item.product_code,
      product_name: item.product_name,
      quantity: item.quantity.toString(), // 确保是字符串类型
      status: item.completed_at ? "completed" : "temporary",
      created_at: item.created_at,
      completed_at: item.completed_at
    }));
    
    // 如果请求了特定状态的订单，则在内存中筛选
    if (status) {
      orders = orders.filter(order => order.status === status);
    }
    
    return orders;
  }

  async createOrder(orderData: InsertOrder): Promise<Order> {
    const id = nanoid();
    const now = new Date().toISOString();
    
    // 准备数据，适配原始 HTML 中使用的字段名
    const orderRecord = {
      item_id: id, // 原 HTML 使用 item_id 作为唯一标识符
      order_date: orderData.delivery_date, // 原 HTML 使用 order_date 字段
      product_code: orderData.product_code,
      product_name: orderData.product_name,
      quantity: orderData.quantity,
      created_at: now
      // 移除 status 字段，因为原始表可能没有这个字段
    };
    
    const { data, error } = await supabase
      .from(this.tableName)
      .insert(orderRecord)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating order:', error);
      throw error;
    }
    
    // 转换为应用期望的格式
    return {
      id: data.item_id,
      delivery_date: data.order_date,
      product_code: data.product_code,
      product_name: data.product_name,
      quantity: data.quantity.toString(),
      status: data.completed_at ? "completed" : "temporary",
      created_at: data.created_at,
      completed_at: data.completed_at
    };
  }

  async deleteOrder(id: string): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('item_id', id); // 使用 item_id 字段
    
    if (error) {
      console.error('Error deleting order:', error);
      throw error;
    }
  }

  async completeOrder(id: string): Promise<Order> {
    const now = new Date().toISOString();
    
    // 如果原始表没有 status 字段，则只更新 completed_at
    const { data, error } = await supabase
      .from(this.tableName)
      .update({
        completed_at: now
      })
      .eq('item_id', id) // 使用 item_id 字段
      .select()
      .single();
    
    if (error) {
      console.error('Error completing order:', error);
      throw error;
    }
    
    // 转换为应用期望的格式
    return {
      id: data.item_id,
      delivery_date: data.order_date,
      product_code: data.product_code,
      product_name: data.product_name,
      quantity: data.quantity.toString(),
      status: "completed", // 直接设置为已完成
      created_at: data.created_at,
      completed_at: data.completed_at
    };
  }

  async generateOrderStats(year: string, month?: string): Promise<OrderStats> {
    // Build date range
    let startDate: string;
    let endDate: string;
    let periodText: string;
    
    if (month) {
      // Specific month
      const monthNum = parseInt(month, 10);
      const paddedMonth = monthNum.toString().padStart(2, '0');
      startDate = `${year}-${paddedMonth}-01`;
      
      // Calculate last day of month
      const lastDay = new Date(parseInt(year), monthNum, 0).getDate();
      endDate = `${year}-${paddedMonth}-${lastDay}`;
      
      periodText = `${year}年${monthNum}月`;
    } else {
      // Entire year
      startDate = `${year}-01-01`;
      endDate = `${year}-12-31`;
      periodText = `${year}年全年`;
    }
    
    // Get completed orders for the date range
    const completedOrders = await this.getOrdersByDateRange(startDate, endDate, "completed");
    
    // Prepare stats
    const productStats: Record<string, StatItem> = {};
    
    // Calculate stats
    completedOrders.forEach(order => {
      if (!productStats[order.product_code]) {
        productStats[order.product_code] = {
          code: order.product_code,
          name: order.product_name,
          totalQuantity: 0,
          orderCount: 0
        };
      }
      
      // Parse quantity as it might be stored as string in some environments
      const quantity = typeof order.quantity === 'string' 
        ? parseFloat(order.quantity.toString()) 
        : Number(order.quantity);
      
      productStats[order.product_code].totalQuantity += quantity;
      productStats[order.product_code].orderCount += 1;
    });
    
    // Convert to array and sort by total quantity (descending)
    const statsArray = Object.values(productStats).sort((a, b) => 
      b.totalQuantity - a.totalQuantity
    );
    
    return {
      stats: statsArray,
      periodText,
      totalOrders: completedOrders.length
    };
  }
}

// Export an instance of the SupabaseStorage
export const storage = new SupabaseStorage();
