// Product type from spreadsheet
export interface Product {
  code: string;
  name: string;
  color?: string;
  price?: number;
  [key: string]: any;  // Allow for flexible additional fields
}

// Order type
export interface Order {
  id: string;
  delivery_date: string;
  product_code: string;
  product_name: string;
  quantity: number;
  status: 'temporary' | 'completed';
  created_at: string;
  completed_at?: string;
}

// Grouped orders by delivery date
export interface GroupedOrders {
  [date: string]: Order[];
}

// Stats item for reporting
export interface StatItem {
  code: string;
  name: string;
  totalQuantity: number;
  orderCount: number;
  unitPrice?: number;   // 產品單價
  totalPrice?: number;  // 總價 (單價 * 數量)
}
