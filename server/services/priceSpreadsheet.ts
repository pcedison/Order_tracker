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
  private RANGE = '產品!A2:H300'; // 使用實際產品表範圍

  constructor() {
    // 從環境變數獲取 API key 和 spreadsheet ID
    this.apiKey = process.env.PRICE_SPREADSHEET_API_KEY || 'AIzaSyAnztgYJgF15NjENuXITpPxyR8pLHFVkQ0';
    this.spreadsheetId = process.env.PRICE_SPREADSHEET_ID || '13N3pRr3ElH2EoP6ZIUNW_Cod5o4FiG7upNnc2CD-zVI';
    
    console.log('價格表服務初始化，使用API Key和Spreadsheet ID:', 
                this.apiKey ? '已設置API Key' : '未設置API Key', 
                this.spreadsheetId ? '已設置Spreadsheet ID' : '未設置Spreadsheet ID');
  }

  // 根據需要刷新價格緩存
  private async refreshCache() {
    const now = Date.now();
    
    // 如果緩存有效，返回緩存數據
    if (this.pricesCache.length > 0 && (now - this.lastFetchTime) < this.cacheDuration) {
      return this.pricesCache;
    }
    
    try {
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
      
      // 處理價格數據 - 根據實際電子表格結構調整
      const prices: ProductPrice[] = rows
        .filter((row: any[]) => row.length >= 2 && row[0])
        .map((row: any[]) => {
          // 在這裡處理您的電子表格行結構
          // 假設第1列(索引0)是產品編號，第5列(索引4)是價格
          const code = row[0]?.toString().trim() || '';
          const priceValue = row[4] ? parseFloat(row[4].toString().replace(/,/g, '')) : 0;
          
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
    
    // 建立編號到價格的映射
    const priceMap = new Map(prices.map(p => [p.code.toLowerCase(), p.price]));
    
    // 為每個請求的產品編號查找價格
    for (const code of productCodes) {
      result[code] = priceMap.get(code.toLowerCase()) || 0;
    }
    
    return result;
  }
}

// 導出單例實例
export const priceSpreadsheetService = new PriceSpreadsheetService();