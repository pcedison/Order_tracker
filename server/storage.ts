import { type Order, type InsertOrder, configs } from "@shared/schema";
import { nanoid } from "nanoid";
import { supabase } from "./supabase";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { SecureAuthService } from "./services/secureAuth";
import { priceSpreadsheetService } from "./services/priceSpreadsheet";
import { pool } from "./db";

// Define types for statistics
interface StatItem {
  code: string;
  name: string;
  totalQuantity: number;
  orderCount: number;
  unitPrice?: number;      // 單價
  totalPrice?: number;     // 總價 (單價 * 數量)
}

interface OrderStats {
  stats: StatItem[];
  orders?: Order[];  // 添加原始訂單數據，用於匯出功能
  periodText: string;
  totalOrders: number;
  totalKilograms: number; // 新增總公斤數字段
  totalAmount: number;    // 訂單總金額
}

export interface IStorage {
  getOrders(status?: "temporary" | "completed"): Promise<Order[]>;
  getOrdersByDateRange(startDate: string, endDate: string, status?: "temporary" | "completed"): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  deleteOrder(id: string): Promise<void>;
  updateTemporaryOrder(id: string, quantity: number, delivery_date?: string): Promise<void>;
  completeOrder(id: string): Promise<Order>;
  generateOrderStats(year: string, month?: string): Promise<OrderStats>;
  editHistoryOrder(orderId: string, productCode: string, quantity: number): Promise<void>;
  deleteHistoryOrder(orderId: string, productCode: string): Promise<void>;
  
  // 配置相关方法
  getConfig(key: string): Promise<string | null>;
  setConfig(key: string, value: string): Promise<void>;
  getAllConfigs(): Promise<{[key: string]: string}>;
  updateAdminPassword(currentPassword: string, newPassword: string): Promise<boolean>;
}

export class SupabaseStorage implements IStorage {
  private tempOrdersTable = 'temp_orders'; // 临时订单表
  private ordersTable = 'orders'; // 已完成订单表
  private orderItemsTable = 'order_items'; // 订单项表
  private configsTable = 'configs'; // 配置表
  public authService = new SecureAuthService(); // 用于安全密码验证和加密
  
  constructor() {
    // 在初始化時確保 configs 表存在，然後加載管理員密碼
    this.ensureConfigsTableExists().then(() => {
      this.initializeAdminPassword();
    });
  }
  
  // 確保 Supabase 中的 configs 表存在
  private async ensureConfigsTableExists(): Promise<void> {
    try {
      console.log('檢查 Supabase configs 表是否存在...');
      
      // 嘗試查詢 configs 表來檢查是否存在
      const { error: selectError } = await supabase
        .from(this.configsTable)
        .select('id')
        .limit(1);
      
      if (selectError && selectError.message.includes('does not exist')) {
        console.log('configs 表不存在，嘗試通過插入操作來觸發自動創建...');
        
        // 如果表不存在，嘗試通過應用程式邏輯創建一個基本結構
        // 注意：這需要在 Supabase 控制台中預先設置正確的權限
        console.log('請在 Supabase 控制台中手動創建 configs 表');
        console.log('SQL: CREATE TABLE configs (id SERIAL PRIMARY KEY, key TEXT UNIQUE, value TEXT, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW());');
        
        return;
      }
      
      if (selectError) {
        console.error('檢查 configs 表時發生其他錯誤:', selectError.message);
        return;
      }
      
      console.log('✓ Supabase configs 表已存在並可正常訪問');
      
    } catch (error) {
      console.error('檢查 configs 表時發生錯誤:', error);
    }
  }
  
  // 從 Supabase 數據庫加載管理員密碼並設置到 AuthService
  private async initializeAdminPassword() {
    try {
      console.log('開始從 Supabase 數據庫加載安全密碼數據');
      
      // 使用 Supabase 查詢安全密碼
      const { data: configRecord, error } = await supabase
        .from(this.configsTable)
        .select('value')
        .eq('key', 'ADMIN_PASSWORD_SECURE')
        .maybeSingle();
      
      if (error && !error.message.includes('does not exist')) {
        console.error('讀取 Supabase 安全密碼失敗:', error.message);
      }
      
      console.log('Supabase 配置查詢完成');
      
      // 初始化安全密碼系統
      await this.authService.initializeFromDatabase(configRecord?.value || null);
      
      // 如果是新系統首次運行，儲存預設加密密碼到 Supabase
      if (!configRecord?.value && this.authService.isPasswordInitialized()) {
        const passwordData = this.authService.getCurrentPasswordData();
        if (passwordData) {
          console.log('儲存預設加密密碼到 Supabase 資料庫');
          
          const { error: insertError } = await supabase
            .from(this.configsTable)
            .upsert({ 
              key: 'ADMIN_PASSWORD_SECURE',
              value: passwordData,
              updated_at: new Date().toISOString()
            });
            
          if (insertError) {
            console.error('儲存加密密碼到 Supabase 失敗:', insertError.message);
            console.log('將使用記憶體中的安全密碼系統');
          } else {
            console.log('已成功儲存加密密碼到 Supabase 資料庫');
          }
        }
      }
    } catch (error) {
      console.error('初始化安全密碼系統時發生錯誤:', error);
      // 安全失敗處理：初始化預設密碼
      await this.authService.initializeFromDatabase(null);
    }
  }
  
  async getOrders(status?: "temporary" | "completed"): Promise<Order[]> {
    if (status === "completed") {
      // 从订单项表中获取订单，带外键关联
      const { data, error } = await supabase
        .from(this.orderItemsTable)
        .select(`
          product_code,
          product_name,
          quantity,
          order_id,
          orders!inner (
            id,
            order_date,
            created_at
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching completed orders:', error);
        throw error;
      }
      
      // 转换结果集成应用期望的格式
      const orders = data.map((item: any) => ({
        id: item.orders?.id || "",
        delivery_date: item.orders?.order_date || "",
        product_code: item.product_code,
        product_name: item.product_name,
        quantity: item.quantity.toString(),
        status: "completed" as "completed",
        created_at: item.orders?.created_at || "",
        completed_at: item.orders?.created_at || ""
      }));
      
      return orders;
    } else {
      // 获取临时订单（从 temp_orders 表中）
      let query = supabase
        .from(this.tempOrdersTable)
        .select('*');
      
      // 由于原始表结构可能没有 completed_at 字段
      // 我们不使用这个条件，而是在客户端进行过滤
      
      // Order by created_at in descending order
      query = query.order('created_at', { ascending: false });
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching orders:', error);
        throw error;
      }
      
      // 转换 Supabase 格式到应用期望的格式
      const orders = data.map(item => ({
        id: item.item_id, // 原始 HTML 文件中使用 item_id 字段作为主键
        delivery_date: item.order_date, // 原始 HTML 使用 order_date 字段
        product_code: item.product_code,
        product_name: item.product_name,
        quantity: item.quantity.toString(), // 确保是字符串类型
        status: "temporary" as "temporary", // 临时订单表的状态都是临时
        created_at: item.created_at,
        completed_at: null // 临时订单无完成时间
      }));
      
      return orders;
    }
  }

  async getOrdersByDateRange(startDate: string, endDate: string, status?: "temporary" | "completed"): Promise<Order[]> {
    if (status === "completed") {
      // 获取已完成的历史订单（从 orders 和 order_items 表中）
      console.log(`查詢已完成訂單 - 開始日期: ${startDate}, 結束日期: ${endDate}`);
      
      const { data: orderData, error: orderError } = await supabase
        .from(this.ordersTable)
        .select('id, order_date, created_at')
        .gte('order_date', startDate)
        .lte('order_date', endDate)
        .order('created_at', { ascending: false });
      
      if (orderError) {
        console.error('Error fetching completed orders:', orderError);
        throw orderError;
      }
      
      if (orderData.length === 0) {
        return [];
      }
      
      // 准备返回的订单数组
      const orders: Order[] = [];
      
      // 对每个订单获取其订单项
      for (const order of orderData) {
        const { data: items, error: itemsError } = await supabase
          .from(this.orderItemsTable)
          .select('*')
          .eq('order_id', order.id);
        
        if (itemsError) {
          console.error(`Error fetching items for order ${order.id}:`, itemsError);
          continue;
        }
        
        // 将每个订单项转换为应用期望的格式并添加到数组
        for (const item of items) {
          orders.push({
            id: order.id,
            delivery_date: order.order_date,
            product_code: item.product_code,
            product_name: item.product_name,
            quantity: item.quantity.toString(),
            status: "completed" as "completed",
            created_at: order.created_at,
            completed_at: order.created_at // 历史订单已完成
          });
        }
      }
      
      return orders;
    } else {
      // 获取临时订单（从 temp_orders 表中）
      let query = supabase
        .from(this.tempOrdersTable)
        .select('*')
        .gte('order_date', startDate)
        .lte('order_date', endDate);
      
      // 由于原始表结构可能没有 completed_at 字段，我们不使用这个条件
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching orders by date range:', error);
        throw error;
      }
      
      // 转换数据格式
      const orders = data.map(item => ({
        id: item.item_id,
        delivery_date: item.order_date,
        product_code: item.product_code,
        product_name: item.product_name,
        quantity: item.quantity.toString(),
        status: "temporary" as "temporary", // 临时订单都是temporary
        created_at: item.created_at,
        completed_at: null // 临时订单无完成时间
      }));
      
      return orders;
    }
  }

  async createOrder(orderData: InsertOrder): Promise<Order> {
    // 生成唯一 ID
    const itemId = Date.now().toString();
    const now = new Date().toISOString();
    
    // 准备数据，适配原始 HTML 中使用的字段名
    const orderRecord = {
      item_id: itemId, // 使用与原始 HTML 相同的 item_id 字段
      order_date: orderData.delivery_date, // 原 HTML 使用 order_date 字段
      product_code: orderData.product_code,
      product_name: orderData.product_name,
      quantity: orderData.quantity,
      created_at: now
      // 没有 status 字段，原始表使用 completed_at 判断状态
    };
    
    const { data, error } = await supabase
      .from(this.tempOrdersTable)
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
      status: "temporary" as "temporary", // 新建订单都是临时订单
      created_at: data.created_at,
      completed_at: null // 无完成时间
    };
  }

  async deleteOrder(id: string): Promise<void> {
    // 使用 item_id 字段
    const { error } = await supabase
      .from(this.tempOrdersTable)
      .delete()
      .eq('item_id', id);
    
    if (error) {
      console.error('Error deleting order:', error);
      throw error;
    }
  }
  
  async updateTemporaryOrder(id: string, quantity: number, delivery_date?: string): Promise<void> {
    // 准备更新数据
    const updateData: { quantity: number; order_date?: string } = { quantity };
    
    // 如果提供了日期，同时更新日期
    if (delivery_date) {
      updateData.order_date = delivery_date;
    }
    
    // 更新临时订单
    const { error } = await supabase
      .from(this.tempOrdersTable)
      .update(updateData)
      .eq('item_id', id);
    
    if (error) {
      console.error('Error updating temporary order:', error);
      throw error;
    }
  }

  async completeOrder(id: string): Promise<Order> {
    // 1. 获取临时订单
    const { data: tempOrder, error: getError } = await supabase
      .from(this.tempOrdersTable)
      .select('*')
      .eq('item_id', id)
      .single();
    
    if (getError) {
      console.error('Error fetching temporary order:', getError);
      throw getError;
    }
    
    try {
      // 2. 创建主订单（如果该日期不存在）
      const { data: existingOrder, error: checkError } = await supabase
        .from(this.ordersTable)
        .select('id')
        .eq('order_date', tempOrder.order_date)
        .maybeSingle();
      
      if (checkError) {
        console.error('Error checking existing order:', checkError);
        throw checkError;
      }
      
      let orderId: string;
      
      if (!existingOrder) {
        // 创建新的主订单记录
        const { data: newOrder, error: createOrderError } = await supabase
          .from(this.ordersTable)
          .insert([{ order_date: tempOrder.order_date }])
          .select('id')
          .single();
        
        if (createOrderError) {
          console.error('Error creating order record:', createOrderError);
          throw createOrderError;
        }
        
        orderId = newOrder.id;
      } else {
        // 使用现有订单ID
        orderId = existingOrder.id;
      }
      
      // 3. 创建订单项
      const { error: createItemError } = await supabase
        .from(this.orderItemsTable)
        .insert([{
          order_id: orderId,
          product_code: tempOrder.product_code,
          product_name: tempOrder.product_name,
          quantity: tempOrder.quantity
        }]);
      
      if (createItemError) {
        console.error('Error creating order item:', createItemError);
        throw createItemError;
      }
      
      // 4. 删除临时订单
      const { error: deleteError } = await supabase
        .from(this.tempOrdersTable)
        .delete()
        .eq('item_id', id);
      
      if (deleteError) {
        console.error('Error deleting temporary order:', deleteError);
        throw deleteError;
      }
      
      // 5. 返回转换后的订单
      const completedOrder: Order = {
        id: tempOrder.item_id,
        delivery_date: tempOrder.order_date,
        product_code: tempOrder.product_code,
        product_name: tempOrder.product_name,
        quantity: tempOrder.quantity as any, // 类型转换
        status: "completed" as "completed",
        created_at: tempOrder.created_at as any, // 类型转换
        completed_at: new Date() as any // 类型转换
      };
      return completedOrder;
    } catch (error) {
      console.error('Error in complete order process:', error);
      throw error;
    }
  }

  async generateOrderStats(year: string, month?: string): Promise<OrderStats> {
    // Build date range
    let startDate: string;
    let endDate: string;
    let periodText: string;
    
    if (month) {
      // 特定月份: 使用上個月26號到本月25號
      const yearNum = parseInt(year, 10);
      const monthNum = parseInt(month, 10);
      
      // 計算上個月的年份和月份
      let prevMonth = monthNum - 1;
      let prevYear = yearNum;
      
      // 處理跨年情況
      if (prevMonth === 0) {
        prevMonth = 12;
        prevYear -= 1;
      }
      
      // 格式化月份
      const paddedMonth = monthNum.toString().padStart(2, '0');
      const paddedPrevMonth = prevMonth.toString().padStart(2, '0');
      
      // 上個月26號至本月25號
      startDate = `${prevYear}-${paddedPrevMonth}-26`;
      endDate = `${year}-${paddedMonth}-25`;
      
      periodText = `${year}年${monthNum}月`;
      console.log(`月份統計 - ${periodText}: ${startDate} 到 ${endDate}`);
    } else {
      // 整年: 根據月份邏輯，使用前一年12月26號至當年12月25號
      const prevYear = parseInt(year, 10) - 1;
      startDate = `${prevYear}-12-26`;
      endDate = `${year}-12-25`;
      periodText = `${year}年全年`;
      console.log(`年度統計 - ${periodText}: ${startDate} 到 ${endDate}`);
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
          orderCount: 0,
          unitPrice: 0,
          totalPrice: 0
        };
      }
      
      // Parse quantity as it might be stored as string in some environments
      const quantity = typeof order.quantity === 'string' 
        ? parseFloat(order.quantity.toString()) 
        : Number(order.quantity);
      
      productStats[order.product_code].totalQuantity += quantity;
      productStats[order.product_code].orderCount += 1;
    });
    
    try {
      // 獲取所有產品的價格
      const productCodes = Object.keys(productStats);
      const productPrices = await priceSpreadsheetService.getPricesByCodes(productCodes);
      
      // 更新統計數據，添加價格信息
      for (const code of productCodes) {
        const unitPrice = productPrices[code] || 0;
        productStats[code].unitPrice = unitPrice;
        productStats[code].totalPrice = unitPrice * productStats[code].totalQuantity;
      }
    } catch (error) {
      console.error('獲取產品價格失敗:', error);
      // 如果價格查詢失敗，我們仍然繼續執行，僅記錄錯誤
    }
    
    // Convert to array and sort by total quantity (descending)
    const statsArray = Object.values(productStats).sort((a, b) => 
      b.totalQuantity - a.totalQuantity
    );
    
    // 計算所有訂單的總公斤數
    const totalKilograms = statsArray.reduce((sum, item) => sum + item.totalQuantity, 0);
    
    // 計算所有訂單的總金額
    const totalAmount = statsArray.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    
    return {
      stats: statsArray,
      orders: completedOrders, // 添加原始訂單數據
      periodText,
      totalOrders: completedOrders.length,
      totalKilograms: parseFloat(totalKilograms.toFixed(2)), // 保留兩位小數
      totalAmount: parseFloat(totalAmount.toFixed(2)) // 保留兩位小數
    };
  }
  
  async editHistoryOrder(orderId: string, productCode: string, quantity: number): Promise<void> {
    try {
      // 查找订单项
      const { data: orderItem, error: findError } = await supabase
        .from(this.orderItemsTable)
        .select('*')
        .eq('order_id', orderId)
        .eq('product_code', productCode)
        .single();
      
      if (findError) {
        console.error('Error finding order item:', findError);
        throw findError;
      }
      
      if (!orderItem) {
        throw new Error('Order item not found');
      }
      
      // 更新订单项数量
      const { error: updateError } = await supabase
        .from(this.orderItemsTable)
        .update({ quantity })
        .eq('order_id', orderId)
        .eq('product_code', productCode);
      
      if (updateError) {
        console.error('Error updating order item:', updateError);
        throw updateError;
      }
    } catch (error) {
      console.error('Error in editHistoryOrder:', error);
      throw error;
    }
  }
  
  async deleteHistoryOrder(orderId: string, productCode: string): Promise<void> {
    try {
      // 删除订单项
      const { error: deleteError } = await supabase
        .from(this.orderItemsTable)
        .delete()
        .eq('order_id', orderId)
        .eq('product_code', productCode);
      
      if (deleteError) {
        console.error('Error deleting order item:', deleteError);
        throw deleteError;
      }
      
      // 检查是否还有其他订单项与该订单关联
      const { data: remainingItems, error: checkError } = await supabase
        .from(this.orderItemsTable)
        .select('order_id')
        .eq('order_id', orderId);
      
      if (checkError) {
        console.error('Error checking remaining items:', checkError);
        throw checkError;
      }
      
      // 如果该订单没有其他订单项，则删除主订单
      if (remainingItems.length === 0) {
        const { error: deleteOrderError } = await supabase
          .from(this.ordersTable)
          .delete()
          .eq('id', orderId);
        
        if (deleteOrderError) {
          console.error('Error deleting main order:', deleteOrderError);
          throw deleteOrderError;
        }
      }
    } catch (error) {
      console.error('Error in deleteHistoryOrder:', error);
      throw error;
    }
  }

  // 配置管理方法实现
  async getConfig(key: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from(this.configsTable)
        .select('value')
        .eq('key', key)
        .maybeSingle();
      
      if (error && !error.message.includes('does not exist')) {
        console.error(`Error getting config for key ${key}:`, error.message);
      }
      
      return data?.value || null;
    } catch (error) {
      console.error(`Error getting config for key ${key}:`, error);
      return null;
    }
  }

  async setConfig(key: string, value: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(this.configsTable)
        .upsert({ 
          key, 
          value,
          updated_at: new Date().toISOString()
        });
      
      if (error) {
        console.error(`Error setting config for key ${key}:`, error.message);
        throw error;
      }
    } catch (error) {
      console.error(`Error setting config for key ${key}:`, error);
      throw error;
    }
  }

  async getAllConfigs(): Promise<{[key: string]: string}> {
    try {
      const { data: configRecords, error } = await supabase
        .from(this.configsTable)
        .select('key, value');
      
      if (error && !error.message.includes('does not exist')) {
        console.error('Error getting all configs:', error.message);
        return this.getDefaultConfigs();
      }
      
      const configsMap: {[key: string]: string} = {};
      configRecords?.forEach(config => {
        if (config.key && config.value) {
          configsMap[config.key] = config.value;
        }
      });
      
      // 添加默认配置
      const defaultConfigs = this.getDefaultConfigs();
      return { ...defaultConfigs, ...configsMap };
    } catch (error) {
      console.error('Error getting all configs:', error);
      return this.getDefaultConfigs();
    }
  }
  
  // 添加一个新方法，返回默认配置
  private getDefaultConfigs(): {[key: string]: string} {
    // 环境变量的获取逻辑
    const getEnvSecure = (key: string) => {
      if (!process.env[key]) {
        return '';
      }
      return process.env[key] || '';
    };
    
    // 使用环境变量作为唯一来源，确保即使数据库不可用也能正常工作
    return {
      SUPABASE_URL: getEnvSecure('SUPABASE_URL'),
      SUPABASE_KEY: getEnvSecure('SUPABASE_KEY'),
      SPREADSHEET_API_KEY: getEnvSecure('SPREADSHEET_API_KEY'),
      SPREADSHEET_ID: getEnvSecure('SPREADSHEET_ID'),
      PRICE_SPREADSHEET_API_KEY: getEnvSecure('PRICE_SPREADSHEET_API_KEY'),
      PRICE_SPREADSHEET_ID: getEnvSecure('PRICE_SPREADSHEET_ID'),
      ADMIN_PASSWORD: getEnvSecure('ADMIN_PASSWORD')
    };
  }
  
  // 創建一個從環境變數中獲取配置項的方法
  public getConfigFromEnv(key: string): string {
    if (!process.env[key]) {
      return '';
    }
    return process.env[key] || '';
  }

  async updateAdminPassword(currentPassword: string, newPassword: string): Promise<boolean> {
    try {
      console.log('開始更新管理員密碼流程');
      
      // 第1步: 檢查當前密碼是否正確
      const isValidPassword = await this.authService.verifyPassword(currentPassword);
      
      if (!isValidPassword) {
        console.error('當前密碼驗證失敗');
        return false;
      }
      
      console.log('當前密碼驗證通過');
      
      // 第2步: 使用安全加密系統處理新密碼
      const newPasswordData = this.authService.updatePassword(newPassword);
      const newPasswordToSave = JSON.stringify(newPasswordData);
      console.log('使用安全加密系統處理新密碼');
      
      // 第3步: 更新數據庫中的密碼 (強制覆蓋所有舊密碼)
      let databaseUpdateSuccess = false;
      
      try {
        // 使用原生SQL直接更新密碼，避免Supabase客戶端權限問題
        try {
          // 1. 檢查configs表是否存在，如果不存在則創建
          await pool.query(`
            CREATE TABLE IF NOT EXISTS configs (
              id SERIAL PRIMARY KEY,
              key TEXT UNIQUE NOT NULL,
              value TEXT,
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
          `);
          console.log('確保configs表已存在');
          
          // 2. 更新主密碼
          // 更新安全加密密碼到 Supabase
          const { error: updateError } = await supabase
            .from(this.configsTable)
            .upsert({ 
              key: 'ADMIN_PASSWORD_SECURE',
              value: newPasswordToSave,
              updated_at: new Date().toISOString()
            });
          
          if (updateError) {
            console.error('更新安全密碼失敗:', updateError);
          } else {
            console.log('安全加密密碼已成功更新到數據庫');
            databaseUpdateSuccess = true;
          }
        } catch (sqlError) {
          console.error('直接SQL操作出錯:', sqlError);
        }
      } catch (dbError) {
        console.error('數據庫操作過程中發生異常:', dbError);
      }
      
      // 第4步: 更新內存中的密碼 (立即生效)
      console.log('內存中的安全密碼已更新');
      
      return databaseUpdateSuccess;
    } catch (error) {
      console.error('更新管理員密碼過程中發生錯誤:', error);
      return false;
    }
  }
}

// Export an instance of the SupabaseStorage
export const storage = new SupabaseStorage();
