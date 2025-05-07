# Supabase 安全設置指南

## 行級安全 (RLS) 問題說明

您收到的Supabase安全警告是關於缺少行級安全性(Row Level Security, RLS)的設置。這是一個重要的安全功能，可以控制哪些用戶可以對哪些數據行執行哪些操作。

警告中提到以下表格未啟用RLS:
- `public.orders` - 訂單表
- `public.products` - 產品表
- `public.order_items` - 訂單項目表  
- `public.temp_orders` - 臨時訂單表

未啟用RLS時，任何可以訪問您的Supabase項目的人都可能對這些表執行任何操作，這是一個嚴重的安全隱患。

## 解決方案

### 1. 在Supabase啟用RLS

登錄到您的Supabase項目，然後執行以下步驟:

1. 打開Supabase儀表板
2. 導航到「表編輯器」
3. 對於每個表格(`orders`, `products`, `order_items`, `temp_orders`):
   - 選擇該表
   - 點擊「認證」標籤
   - 將「啟用RLS」開關設置為開啟
   - 點擊「保存」

或者，您可以在SQL編輯器中執行以下命令:

```sql
-- 為所有表啟用RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.temp_orders ENABLE ROW LEVEL SECURITY;
```

### 2. 創建適當的安全政策

啟用RLS後，默認情況下所有操作都會被拒絕。因此，您需要創建政策來允許特定操作。

以下是推薦的政策設置，您可以在SQL編輯器中執行這些命令:

```sql
-- 為訂單表創建策略
CREATE POLICY "允許匿名用戶讀取訂單" 
ON public.orders FOR SELECT 
TO anon
USING (true);

CREATE POLICY "允許服務角色管理訂單" 
ON public.orders FOR ALL 
TO service_role
USING (true);

-- 為產品表創建策略
CREATE POLICY "允許匿名用戶讀取產品" 
ON public.products FOR SELECT 
TO anon
USING (true);

CREATE POLICY "允許服務角色管理產品" 
ON public.products FOR ALL 
TO service_role
USING (true);

-- 為訂單項目表創建策略
CREATE POLICY "允許匿名用戶讀取訂單項目" 
ON public.order_items FOR SELECT 
TO anon
USING (true);

CREATE POLICY "允許服務角色管理訂單項目" 
ON public.order_items FOR ALL 
TO service_role
USING (true);

-- 為臨時訂單表創建策略
CREATE POLICY "允許匿名用戶讀取臨時訂單" 
ON public.temp_orders FOR SELECT 
TO anon
USING (true);

CREATE POLICY "允許服務角色管理臨時訂單" 
ON public.temp_orders FOR ALL 
TO service_role
USING (true);
```

這些政策將:
- 允許匿名用戶（包括未登錄的用戶）只讀取（SELECT）所有表的數據
- 允許服務角色（您的服務器應用程序）執行所有操作（SELECT, INSERT, UPDATE, DELETE）

### 3. 使用服務角色密鑰

在本應用程序中，我們已經更新了代碼以優先使用服務角色密鑰，這樣您的服務器應用程序將會繞過RLS限制。確保在您的環境變數中設置:

```
SUPABASE_SERVICE_KEY=your_service_role_key
```

服務角色密鑰可以在Supabase項目設置中的「API」部分找到，通常標記為「service_role secret」。

> **重要**: 服務角色密鑰具有不受RLS限制的完全訪問權限。永遠不要在客戶端代碼中使用它，僅用於服務器端代碼。

## 額外安全措施

除了啟用RLS，還建議採取以下安全措施:

1. **定期輪換密鑰**: 定期更新您的Supabase密鑰，特別是在懷疑可能洩露時。

2. **限制API權限**: 在Supabase項目設置中，檢查並限制您不需要的API功能。

3. **監控異常活動**: 定期檢查Supabase的日誌和使用統計，尋找任何異常活動。

4. **數據備份**: 定期備份您的數據，以防發生安全事件時可以恢復。

## 驗證安全設置

完成上述步驟後，您可以回到Supabase儀表板的「安全性」部分，再次運行安全掃描。如果一切設置正確，之前的警告應該不再顯示。