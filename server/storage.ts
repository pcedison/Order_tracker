import { orders, type Order, type InsertOrder } from "@shared/schema";
import { nanoid } from "nanoid";

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

export class MemStorage implements IStorage {
  private orders: Map<string, Order>;

  constructor() {
    this.orders = new Map();
  }

  async getOrders(status?: "temporary" | "completed"): Promise<Order[]> {
    const allOrders = Array.from(this.orders.values());
    
    if (status) {
      return allOrders.filter(order => order.status === status);
    }
    
    return allOrders;
  }

  async getOrdersByDateRange(startDate: string, endDate: string, status?: "temporary" | "completed"): Promise<Order[]> {
    const allOrders = Array.from(this.orders.values());
    
    return allOrders.filter(order => {
      // Filter by date range
      const orderDate = order.delivery_date;
      const isInDateRange = orderDate >= startDate && orderDate <= endDate;
      
      // Filter by status if provided
      const hasMatchingStatus = status ? order.status === status : true;
      
      return isInDateRange && hasMatchingStatus;
    });
  }

  async createOrder(orderData: InsertOrder): Promise<Order> {
    const id = nanoid();
    const now = new Date().toISOString();
    
    const order: Order = {
      id,
      ...orderData,
      created_at: now,
      // Type assertion needed because completed_at can be undefined
      completed_at: undefined
    };
    
    this.orders.set(id, order);
    return order;
  }

  async deleteOrder(id: string): Promise<void> {
    if (!this.orders.has(id)) {
      throw new Error(`Order with ID ${id} not found`);
    }
    
    this.orders.delete(id);
  }

  async completeOrder(id: string): Promise<Order> {
    const order = this.orders.get(id);
    
    if (!order) {
      throw new Error(`Order with ID ${id} not found`);
    }
    
    const updatedOrder: Order = {
      ...order,
      status: "completed",
      completed_at: new Date().toISOString()
    };
    
    this.orders.set(id, updatedOrder);
    return updatedOrder;
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
        ? parseFloat(order.quantity) 
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

export const storage = new MemStorage();
