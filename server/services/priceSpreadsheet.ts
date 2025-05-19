import { supabase } from "../supabase";

// 產品價格表查詢服務
interface ProductPrice {
  code: string;      // 產品編號
  price: number;     // 產品單價
  [key: string]: any;
}

export class PriceSpreadsheetService {
  private apiKey: string;
  private spreadsheetId: string;
  private pricesCache: ProductPrice[] = [];
  private lastFetchTime: number = 0;
  private cacheDuration: number = 1000 * 60 * 5; // 5 分鐘緩存
  private RANGE = '達遠!A2:D400'; // 使用達遠分頁進行價格查詢，增加範圍至D400

  constructor() {
    // 初始化時先從環境變數獲取值，後續刷新緩存時會從配置中獲取最新的值
    this.apiKey = process.env.PRICE_SPREADSHEET_API_KEY || '';
    this.spreadsheetId = process.env.PRICE_SPREADSHEET_ID || '';
  }
  
  // 從配置中取得最新的 API key 和 ID
  async getConfigValues() {
    // 指定我們要從配置中獲取的值
    const apiKey = process.env.PRICE_SPREADSHEET_API_KEY;
    const spreadsheetId = process.env.PRICE_SPREADSHEET_ID;
    
    // 硬編碼測試值（您提供的值）
    if (!apiKey || !spreadsheetId) {
      this.apiKey = "AIzaSyAnztgYJgF15NjENuXITpPxyR8pLHFVkQ0";
      this.spreadsheetId = "13N3pRr3ElH2EoP6ZIUNW_Cod5o4FiG7upNnc2CD-zVI";
      console.log("使用硬編碼的價格表配置");
    }
    
    return { apiKey: this.apiKey, spreadsheetId: this.spreadsheetId };
  }

  // 根據需要刷新價格緩存
  private async refreshCache() {
    const now = Date.now();
    
    // 如果緩存有效，返回緩存數據
    if (this.pricesCache.length > 0 && (now - this.lastFetchTime) < this.cacheDuration) {
      return this.pricesCache;
    }
    
    try {
      // 獲取最新的配置
      await this.getConfigValues();
      
      if (!this.apiKey || !this.spreadsheetId) {
        throw new Error('價格表 API key 或 ID 未提供');
      }
      
      // 從 Google Sheets API 獲取產品價格
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${this.RANGE}?key=${this.apiKey}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch prices spreadsheet: ${response.statusText}`);
      }
      
      const data = await response.json();
      const rows = data.values || [];
      
      // 輸出前10行數據用於調試
      console.log('價格表數據樣本:');
      for (let i = 0; i < Math.min(rows.length, 10); i++) {
        console.log(`Row ${i}: ${JSON.stringify(rows[i])}`);
      }
      
      // 處理價格數據 - 根據達遠分頁的結構調整
      const prices: ProductPrice[] = rows
        .filter((row: any[]) => row.length >= 2 && row[0]) // 確保有編號(A欄)和價格資訊
        .map((row: any[]) => {
          // 根據達遠分頁格式，A欄是產品編號(索引0)，C欄是價格(索引2)
          const code = row[0]?.toString().trim() || '';
          // 處理可能的數字格式（如貨幣符號、逗號等）
          let priceStr = row[2]?.toString() || '0';
          priceStr = priceStr.replace(/[^\d.-]/g, ''); // 僅保留數字、小數點和負號
          const priceValue = parseFloat(priceStr);
          
          return {
            code: code,
            price: isNaN(priceValue) ? 0 : priceValue
          };
        });
      
      this.pricesCache = prices;
      this.lastFetchTime = now;
      console.log(`Fetched ${prices.length} products prices from spreadsheet`);
      
      return prices;
    } catch (error) {
      console.error('Error refreshing prices cache:', error);
      return []; // 出錯時返回空數組
    }
  }

  // 獲取所有產品價格
  async getPrices(): Promise<ProductPrice[]> {
    return this.refreshCache();
  }

  // 根據產品編號獲取價格
  async getPriceByCode(productCode: string): Promise<number> {
    const prices = await this.refreshCache();
    const product = prices.find(p => p.code.toLowerCase() === productCode.toLowerCase());
    return product ? product.price : 0;
  }

  // 批量獲取多個產品的價格
  async getPricesByCodes(productCodes: string[]): Promise<Record<string, number>> {
    const prices = await this.refreshCache();
    const result: Record<string, number> = {};
    
    // 檢視獲取到的價格數據
    console.log(`找到 ${prices.length} 個產品價格記錄`);
    
    // 建立產品編號到價格的映射（以原始格式和小寫格式都存儲）
    const priceMap = new Map();
    for (const p of prices) {
      // 原始編號
      priceMap.set(p.code, p.price);
      
      // 小寫編號
      priceMap.set(p.code.toLowerCase(), p.price);
      
      // 無連字符版本
      priceMap.set(p.code.replace(/-/g, ''), p.price);
      priceMap.set(p.code.toLowerCase().replace(/-/g, ''), p.price);
      
      // 無括號版本
      priceMap.set(p.code.replace(/[\(\)]/g, ''), p.price);
      priceMap.set(p.code.toLowerCase().replace(/[\(\)]/g, ''), p.price);
      
      // 組合版本 (無連字符且無括號)
      priceMap.set(p.code.replace(/[-\(\)]/g, ''), p.price);
      priceMap.set(p.code.toLowerCase().replace(/[-\(\)]/g, ''), p.price);
    }
    
    // 為每個請求的產品編號查找價格
    for (const code of productCodes) {
      // 嘗試多種匹配方式
      const variations = [
        code,                                  // 原始編號
        code.toLowerCase(),                    // 小寫
        code.replace(/-/g, ''),                // 移除連字符
        code.toLowerCase().replace(/-/g, ''),  // 小寫且移除連字符
        code.replace(/[\(\)]/g, ''),           // 移除括號
        code.toLowerCase().replace(/[\(\)]/g, ''), // 小寫且移除括號
        code.replace(/[-\(\)]/g, ''),          // 移除連字符和括號
        code.toLowerCase().replace(/[-\(\)]/g, '') // 小寫且移除連字符和括號
      ];
      
      // 嘗試所有變體
      let price;
      let matchedVariation;
      for (const variant of variations) {
        if (priceMap.has(variant)) {
          price = priceMap.get(variant);
          matchedVariation = variant;
          break;
        }
      }
      
      // 不再使用預設價格，完全以試算表上的價格為準
      /* 
      移除了默認價格的設定，確保所有價格都直接從Google Spreadsheet獲取
      */
      
      if (price !== undefined) {
        result[code] = price;
        if (matchedVariation !== code) {
          console.log(`產品 ${code} 通過變體 ${matchedVariation} 匹配到價格: ${price}`);
        } else {
          console.log(`產品 ${code} 的價格: ${price}`);
        }
      } else {
        // 嘗試尋找近似的產品編號
        console.log(`找不到產品 ${code} 的價格，嘗試尋找近似產品編號...`);
        
        // 列出所有以相同前綴開頭的產品編號
        const codePrefix = code.toLowerCase().substring(0, Math.min(4, code.length));
        const priceKeys = Array.from(prices.map(p => p.code));
        
        const similarCodes = priceKeys.filter(k => 
          k.toLowerCase().startsWith(codePrefix) || 
          k.toLowerCase().includes(codePrefix)
        );
        
        if (similarCodes.length > 0) {
          console.log(`【注意】發現與 ${code} 相似的產品編號: ${similarCodes.join(', ')}`);
          // 使用第一個相似的產品編號
          const similar = similarCodes[0];
          const similarProduct = prices.find(p => p.code === similar);
          if (similarProduct) {
            result[code] = similarProduct.price;
            console.log(`使用相似產品 ${similar} 的價格: ${result[code]}`);
          }
        } else {
          console.log(`沒有找到與 ${code} 相似的產品編號`);
          result[code] = 0; // 找不到價格時設為 0
        }
      }
    }
    
    return result;
  }
}

// 導出單例實例
export const priceSpreadsheetService = new PriceSpreadsheetService();