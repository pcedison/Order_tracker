import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useProducts } from "@/hooks/useProducts";
import { useOrders } from "@/hooks/useOrders";
import { Product } from "@/lib/types";
import { Calendar, Search, Weight, X, CheckCircle } from 'lucide-react';

export default function OrderForm() {
  const [deliveryDate, setDeliveryDate] = useState<string>(() => {
    // Default to current day
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [productQuery, setProductQuery] = useState("");
  const [quantity, setQuantity] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { toast } = useToast();
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const { products, isLoadingProducts, searchProducts, loadingStatus } = useProducts();
  const { createOrder, loadOrders } = useOrders();
  
  // Handle click outside suggestions dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        (event.target as HTMLElement).id !== "productSearch"
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleProductSearch = (value: string) => {
    setProductQuery(value);
    setSelectedProduct(null);
    
    if (value.trim()) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setProductQuery(`${product.code} - ${product.name}`);
    setShowSuggestions(false);
  };

  const clearSearch = () => {
    setProductQuery("");
    setSelectedProduct(null);
    setShowSuggestions(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProduct) {
      toast({
        title: "請選擇產品",
        description: "請從搜尋結果中選擇一個產品",
        variant: "destructive"
      });
      return;
    }

    if (!quantity || parseInt(quantity) <= 0) {
      toast({
        title: "請輸入有效數量",
        description: "數量必須大於 0",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await createOrder({
        delivery_date: deliveryDate,
        product_code: selectedProduct.code,
        product_name: selectedProduct.name,
        quantity: parseInt(quantity),
        status: "temporary"
      });

      // Reset form
      setProductQuery("");
      setSelectedProduct(null);
      setQuantity("");
      setShowSuggestions(false);

      toast({
        title: "訂單建立成功",
        description: `已建立 ${selectedProduct.name} 的暫存訂單`
      });

      await loadOrders();
    } catch (error) {
      console.error("Error creating order:", error);
      toast({
        title: "建立訂單失敗",
        description: "請稍後再試或聯繫系統管理員",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProducts = products.filter(product => {
    if (!productQuery) return false;
    const query = productQuery.toLowerCase();
    return (
      product.code.toLowerCase().includes(query) ||
      product.name.toLowerCase().includes(query)
    );
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 到貨日期 */}
      <div className="relative">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          <Calendar className="inline mr-2 text-purple-500" size={16} />
          到貨日期
        </label>
        <input
          type="date"
          value={deliveryDate}
          onChange={(e) => setDeliveryDate(e.target.value)}
          className="input-modern w-full px-4 py-3 rounded-xl text-gray-800"
          required
        />
      </div>

      {/* 產品搜尋 */}
      <div className="relative">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          <Search className="inline mr-2 text-purple-500" size={16} />
          搜尋產品
        </label>
        <div className="relative">
          <input
            id="productSearch"
            type="text"
            value={productQuery}
            onChange={(e) => handleProductSearch(e.target.value)}
            placeholder="輸入產品編號、名稱..."
            className="input-modern w-full pl-12 pr-12 py-3 rounded-xl text-gray-800"
            autoComplete="off"
          />
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          {productQuery && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* 搜尋建議 */}
        {showSuggestions && filteredProducts.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute z-20 w-full mt-2 glass-morphism rounded-xl shadow-2xl max-h-64 overflow-y-auto"
          >
            {filteredProducts.slice(0, 10).map((product) => (
              <button
                key={product.code}
                type="button"
                onClick={() => handleSelectProduct(product)}
                className="search-suggestion w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-gray-800">{product.code}</div>
                  <div className="text-sm text-gray-600">{product.name}</div>
                </div>
                {product.color && (
                  <div className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
                    {product.color}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {showSuggestions && productQuery && filteredProducts.length === 0 && (
          <div className="absolute z-20 w-full mt-2 glass-morphism rounded-xl shadow-2xl p-4 text-center text-gray-500">
            <Search size={32} className="mx-auto mb-2 text-gray-300" />
            <p>找不到符合的產品</p>
          </div>
        )}
      </div>

      {/* 數量輸入 */}
      <div className="relative">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          <Weight className="inline mr-2 text-purple-500" size={16} />
          數量
        </label>
        <div className="flex space-x-3">
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="輸入數量"
            min="1"
            className="input-modern flex-1 px-4 py-3 rounded-xl text-gray-800"
            required
          />
          <span className="flex items-center px-6 bg-gray-100 rounded-xl font-semibold text-gray-700">
            公斤
          </span>
        </div>
      </div>

      {/* 選中的產品資訊 */}
      {selectedProduct && (
        <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200 animate-fade-in">
          <div className="flex items-center space-x-3">
            <div className="gradient-success p-2 rounded-lg">
              <CheckCircle className="text-white" size={16} />
            </div>
            <div>
              <h4 className="font-semibold text-gray-800">已選擇產品</h4>
              <p className="text-sm text-gray-600">
                {selectedProduct.code} - {selectedProduct.name}
              </p>
              {selectedProduct.color && (
                <p className="text-xs text-purple-600">顏色: {selectedProduct.color}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 按鈕組 */}
      <div className="flex space-x-4 pt-4">
        <button
          type="submit"
          disabled={isSubmitting || !selectedProduct || !quantity}
          className="flex-1 gradient-primary text-white font-semibold py-3 px-6 rounded-xl btn-3d disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="loading-spinner"></div>
              <span>建立中...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-2">
              <CheckCircle size={16} />
              <span>建立訂單</span>
            </div>
          )}
        </button>
        
        <button
          type="button"
          onClick={() => {
            setProductQuery("");
            setSelectedProduct(null);
            setQuantity("");
            setShowSuggestions(false);
          }}
          className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-xl transition-colors"
        >
          <div className="flex items-center justify-center space-x-2">
            <X size={16} />
            <span>清除</span>
          </div>
        </button>
      </div>

      {/* 載入狀態提示 */}
      {isLoadingProducts && (
        <div className="text-center py-4">
          <div className="loading-spinner mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">{loadingStatus}</p>
        </div>
      )}
    </form>
  );
}