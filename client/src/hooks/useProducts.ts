import { useState, useEffect, useCallback } from "react";
import { Product } from "@/lib/types";

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState("正在載入產品資料...");

  // Fetch products from server
  const fetchProducts = useCallback(async () => {
    setIsLoadingProducts(true);
    setLoadingStatus("正在載入產品資料...");
    
    try {
      const response = await fetch('/api/products');
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setProducts(data);
      setLoadingStatus("產品資料已載入完成");
    } catch (error) {
      console.error("Fetch products error:", error);
      setLoadingStatus("產品資料載入失敗");
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  // Load products on initial mount
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Search products based on query
  const searchProducts = (query: string): Product[] => {
    if (!query.trim()) {
      return [];
    }
    
    const normalizedQuery = query.toLowerCase();
    
    return products.filter((product) => {
      return (
        product.code.toLowerCase().includes(normalizedQuery) ||
        product.name.toLowerCase().includes(normalizedQuery) ||
        (product.color && product.color.toLowerCase().includes(normalizedQuery))
      );
    });
  };

  return {
    products,
    isLoadingProducts,
    loadingStatus,
    fetchProducts,
    searchProducts,
  };
}
