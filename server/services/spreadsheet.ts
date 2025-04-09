// Using direct fetch instead of google-spreadsheet library to match original implementation
interface Product {
  code: string;
  name: string;
  color?: string;
  price?: number;
  [key: string]: any;
}

export class SpreadsheetService {
  private apiKey: string;
  private spreadsheetId: string;
  private productsCache: Product[] = [];
  private lastFetchTime: number = 0;
  private cacheDuration: number = 1000 * 60 * 5; // 5 minutes cache
  private RANGE = '產品清單!A2:B300'; // Match the original range from the HTML

  constructor() {
    // Get API key and spreadsheet ID from environment variables
    this.apiKey = process.env.SPREADSHEET_API_KEY || '';
    this.spreadsheetId = process.env.SPREADSHEET_ID || '';
    
    if (!this.apiKey || !this.spreadsheetId) {
      console.warn('Spreadsheet API key or ID not provided in environment variables');
    }
  }

  // Refresh the products cache if needed
  private async refreshCache() {
    const now = Date.now();
    
    // If cache is valid, return cached data
    if (this.productsCache.length > 0 && (now - this.lastFetchTime) < this.cacheDuration) {
      return this.productsCache;
    }
    
    try {
      if (!this.apiKey || !this.spreadsheetId) {
        throw new Error('Spreadsheet API key or ID not provided');
      }
      
      // Use the Google Sheets API directly via fetch (like the original HTML implementation)
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${encodeURIComponent(this.RANGE)}?key=${this.apiKey}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch spreadsheet data: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.values || !Array.isArray(data.values)) {
        throw new Error('Invalid spreadsheet data format');
      }
      
      // Transform spreadsheet data to product objects
      const products: Product[] = data.values.map((row: any[]) => {
        if (!row[0]) return null; // Skip empty rows
        
        return {
          code: row[0] || '',
          name: row[1] || '',
          // Can add more fields here if needed based on spreadsheet columns
        };
      }).filter(Boolean); // Remove null entries
      
      // Update cache
      this.productsCache = products;
      this.lastFetchTime = now;
      
      return products;
    } catch (error) {
      console.error('Error fetching products from spreadsheet:', error);
      
      // If there's an error but we have cached data, return it
      if (this.productsCache.length > 0) {
        return this.productsCache;
      }
      
      throw error;
    }
  }

  // Get all products
  async getProducts(): Promise<Product[]> {
    return this.refreshCache();
  }

  // Search products by query
  async searchProducts(query: string): Promise<Product[]> {
    const products = await this.getProducts();
    
    if (!query) {
      return [];
    }
    
    const normalizedQuery = query.toLowerCase();
    
    return products.filter(product => {
      return (
        product.code.toLowerCase().includes(normalizedQuery) ||
        product.name.toLowerCase().includes(normalizedQuery) ||
        (product.color && product.color.toLowerCase().includes(normalizedQuery))
      );
    });
  }
}
