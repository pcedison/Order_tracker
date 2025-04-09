import { GoogleSpreadsheet } from 'google-spreadsheet';

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
  private doc: GoogleSpreadsheet | null = null;
  private productsCache: Product[] = [];
  private lastFetchTime: number = 0;
  private cacheDuration: number = 1000 * 60 * 5; // 5 minutes cache

  constructor() {
    // Get API key and spreadsheet ID from environment variables
    this.apiKey = process.env.SPREADSHEET_API_KEY || '';
    this.spreadsheetId = process.env.SPREADSHEET_ID || '';
    
    if (!this.apiKey || !this.spreadsheetId) {
      console.warn('Spreadsheet API key or ID not provided in environment variables');
    }
  }

  private async initializeDoc() {
    if (!this.doc) {
      if (!this.apiKey || !this.spreadsheetId) {
        throw new Error('Spreadsheet API key or ID not provided');
      }
      
      this.doc = new GoogleSpreadsheet(this.spreadsheetId);
      await this.doc.useApiKey(this.apiKey);
    }
    
    return this.doc;
  }

  // Refresh the products cache if needed
  private async refreshCache() {
    const now = Date.now();
    
    // If cache is valid, return cached data
    if (this.productsCache.length > 0 && (now - this.lastFetchTime) < this.cacheDuration) {
      return this.productsCache;
    }
    
    try {
      const doc = await this.initializeDoc();
      await doc.loadInfo();
      
      // Assuming products are in the first sheet
      const sheet = doc.sheetsByIndex[0];
      await sheet.loadHeaderRow();
      
      const rows = await sheet.getRows();
      
      // Convert rows to product objects
      const products: Product[] = rows.map(row => {
        const product: Product = {
          code: row.get('code') || '',
          name: row.get('name') || '',
        };
        
        // Add optional fields if they exist
        if (row.get('color')) {
          product.color = row.get('color');
        }
        
        if (row.get('price')) {
          product.price = parseFloat(row.get('price'));
        }
        
        // Add any other fields from the spreadsheet
        sheet.headerValues.forEach(header => {
          if (header !== 'code' && header !== 'name' && header !== 'color' && header !== 'price') {
            const value = row.get(header);
            if (value !== undefined && value !== null && value !== '') {
              product[header] = value;
            }
          }
        });
        
        return product;
      });
      
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
