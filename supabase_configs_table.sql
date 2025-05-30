-- ==========================================
-- Supabase configs 表創建 SQL
-- 請複製以下 SQL 到 Supabase 控制台的 SQL 編輯器中執行
-- ==========================================

-- 1. 創建 configs 表
CREATE TABLE IF NOT EXISTS public.configs (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. 啟用 Row Level Security (RLS)
ALTER TABLE public.configs ENABLE ROW LEVEL SECURITY;

-- 3. 創建允許公開讀取的政策
DROP POLICY IF EXISTS "Allow public read access" ON public.configs;
CREATE POLICY "Allow public read access" ON public.configs 
  FOR SELECT USING (true);

-- 4. 創建允許公開寫入的政策  
DROP POLICY IF EXISTS "Allow public write access" ON public.configs;
CREATE POLICY "Allow public write access" ON public.configs 
  FOR ALL USING (true);

-- 5. 插入測試數據來驗證表格工作正常
INSERT INTO public.configs (key, value) 
VALUES ('test_key', 'test_value') 
ON CONFLICT (key) DO NOTHING;

-- ==========================================
-- 執行完成後，重新啟動應用程式
-- 系統將自動檢測到表格並儲存加密密碼
-- ==========================================