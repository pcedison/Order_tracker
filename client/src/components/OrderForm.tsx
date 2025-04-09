import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useProducts } from "@/hooks/useProducts";
import { useOrders } from "@/hooks/useOrders";
import { Product } from "@/lib/types";

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

  const { toast } = useToast();
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const { products, isLoadingProducts, searchProducts, loadingStatus } = useProducts();
  const { createOrder } = useOrders();
  
  // Handle click outside suggestions dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        (event.target as HTMLElement).id !== "productCode"
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
    setSelectedProduct(null); // Clear selected product when searching
    
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

  const handleCreateOrder = async () => {
    if (!selectedProduct) {
      toast({
        title: "選擇產品",
        description: "請先選擇一個產品",
        variant: "destructive",
      });
      return;
    }

    if (!quantity || parseInt(quantity) <= 0) {
      toast({
        title: "輸入數量",
        description: "請輸入有效的數量",
        variant: "destructive",
      });
      return;
    }

    if (!deliveryDate) {
      toast({
        title: "選擇日期",
        description: "請選擇到貨日期",
        variant: "destructive",
      });
      return;
    }

    try {
      await createOrder({
        delivery_date: deliveryDate,
        product_code: selectedProduct.code,
        product_name: selectedProduct.name,
        quantity: parseFloat(quantity),
        status: "temporary"
      });

      toast({
        title: "訂單成立",
        description: "訂單已成功建立",
      });

      // Reset form
      setProductQuery("");
      setQuantity("");
      setSelectedProduct(null);
    } catch (error) {
      toast({
        title: "訂單建立失敗",
        description: error instanceof Error ? error.message : "未知錯誤",
        variant: "destructive",
      });
    }
  };

  // Filter products based on search query
  const filteredProducts = searchProducts(productQuery);

  return (
    <div className="bg-neutral p-5 rounded-lg mb-8">
      <h2 className="text-[26px] mb-4">輸入新訂單</h2>
      
      <div className="mb-4">
        <label htmlFor="deliveryDate" className="inline-block w-32 text-[22px]">到貨日期：</label>
        <Input
          type="date"
          id="deliveryDate"
          value={deliveryDate}
          onChange={(e) => setDeliveryDate(e.target.value)}
          className="p-2 text-[22px] border border-[#ccc] rounded w-52 inline-block"
        />
      </div>
      
      <div className="mb-4 relative">
        <label htmlFor="productCode" className="inline-block w-32 text-[22px]">搜尋產品：</label>
        <Input
          id="productCode"
          placeholder="輸入產品編號、名稱或特徵"
          value={productQuery}
          onChange={(e) => handleProductSearch(e.target.value)}
          onFocus={() => productQuery.trim() && setShowSuggestions(true)}
          className="p-2 text-[22px] border border-[#ccc] rounded w-52 inline-block"
        />
        <span className="block text-sm text-gray-600 mt-1 italic">您可以輸入產品編號、名稱、顏色等特徵進行搜尋</span>
        
        {showSuggestions && filteredProducts.length > 0 && (
          <div
            ref={suggestionsRef}
            className="product-suggestions absolute bg-white border border-[#ddd] max-h-[400px] overflow-y-auto w-[350px] z-[100] text-[20px] shadow-md"
            style={{ top: "60px", left: "132px" }}
          >
            {filteredProducts.map((product) => (
              <div
                key={product.code}
                className="suggestion-item p-[10px] cursor-pointer border-b border-[#eee] hover:bg-[#f0f0f0]"
                onClick={() => handleSelectProduct(product)}
              >
                <span className="font-bold text-blue-600">{product.code}</span> - 
                <span className="text-gray-800">{product.name}</span> 
                {product.color && <span className="text-gray-600">({product.color})</span>}
                {product.price && <span className="text-gray-900"> ${product.price}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="mb-4">
        <label htmlFor="quantity" className="inline-block w-32 text-[22px]">公斤數：</label>
        <Input
          type="number"
          id="quantity"
          placeholder="輸入數量"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="p-2 text-[22px] border border-[#ccc] rounded w-52 inline-block"
        />
      </div>
      
      <Button
        id="createOrderBtn"
        onClick={handleCreateOrder}
        className="px-4 py-2.5 text-[22px] bg-[#4CAF50] text-white border-none rounded cursor-pointer mr-2.5 hover:bg-[#45a049]"
      >
        訂單成立
      </Button>
      
      <div id="apiStatus" className="mt-2.5 text-sm text-gray-600">
        {loadingStatus}
      </div>
    </div>
  );
}
