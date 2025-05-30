# 系統維護指南

## 日常維護檢查清單

### 每日檢查項目

- [ ] **系統狀態監控**
  - 檢查應用程式是否正常運行
  - 確認資料庫連線狀態
  - 檢視錯誤日誌數量

- [ ] **效能監控**
  - 檢查回應時間是否正常 (< 2秒)
  - 監控記憶體使用率 (< 80%)
  - 檢查 CPU 使用率 (< 70%)

- [ ] **資料備份驗證**
  - 確認 Supabase 自動備份執行成功
  - 檢查備份檔案完整性

### 每週檢查項目

- [ ] **安全性檢查**
  - 檢查登入失敗次數異常
  - 審查系統存取日誌
  - 確認 SSL 憑證有效期

- [ ] **資料庫維護**
  - 檢查資料庫大小增長
  - 清理過期的 session 資料
  - 分析慢查詢日誌

- [ ] **系統更新**
  - 檢查依賴套件安全更新
  - 評估系統升級需求

### 每月檢查項目

- [ ] **完整系統檢查**
  - 執行完整功能測試
  - 檢查所有 API 端點回應
  - 驗證報表產生功能

- [ ] **效能調優**
  - 分析系統效能趨勢
  - 優化資料庫索引
  - 清理無用的歷史資料

## 密碼管理

### 管理員密碼維護

系統使用 PBKDF2 演算法加密儲存管理員密碼，以下是管理程序：

#### 1. 檢視目前密碼狀態
```sql
-- 在 Supabase 控制台執行
SELECT 
  key, 
  created_at,
  updated_at 
FROM configs 
WHERE key = 'admin_password';
```

#### 2. 更新管理員密碼
```typescript
// 透過系統管理介面或直接 API 呼叫
const updatePassword = async (currentPassword: string, newPassword: string) => {
  const response = await fetch('/api/config/admin-password', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword }),
    credentials: 'include'
  });
  return response.json();
};
```

#### 3. 密碼安全要求
- 最少 8 個字元
- 包含大小寫字母
- 包含數字和特殊符號
- 避免使用常見密碼
- 每 90 天更新一次

#### 4. 緊急密碼重設
如果忘記管理員密碼，可透過直接修改資料庫：

```sql
-- 僅在緊急情況下使用
-- 將密碼重設為 "NewPassword123!"
UPDATE configs 
SET value = '{"hash":"...","salt":"...","iterations":100000}' 
WHERE key = 'admin_password';
```

## 資料庫維護

### Supabase 資料庫管理

#### 1. 監控資料庫大小
```sql
-- 檢查各表的大小
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

#### 2. 清理過期資料
```sql
-- 清理 30 天前的 session 資料
DELETE FROM session 
WHERE expire < NOW() - INTERVAL '30 days';

-- 清理測試訂單資料（小心使用）
DELETE FROM temp_orders 
WHERE created_at < NOW() - INTERVAL '90 days' 
AND product_code LIKE 'TEST%';
```

#### 3. 索引維護
```sql
-- 檢查索引使用狀況
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- 重建索引（如果需要）
REINDEX INDEX idx_orders_delivery_date;
```

#### 4. 備份與恢復
```bash
# 手動備份（透過 Supabase CLI）
supabase db dump --file backup_$(date +%Y%m%d).sql

# 恢復備份
supabase db reset --file backup_20240530.sql
```

## Google Sheets API 維護

### API 金鑰管理

#### 1. 檢查 API 使用量
1. 登入 [Google Cloud Console](https://console.cloud.google.com)
2. 進入「API 和服務」→「配額」
3. 檢查 Google Sheets API 使用量

#### 2. 更新 API 金鑰
```bash
# 在 Replit 環境變數中更新
# 或在 .env 檔案中修改
GOOGLE_SHEETS_API_KEY=new-api-key
GOOGLE_SHEETS_ID=new-spreadsheet-id
```

#### 3. 試算表權限管理
- 確保試算表對服務帳號有「檢視者」權限
- 定期檢查分享設定
- 備份重要的產品資料

### 產品資料維護

#### 1. 產品清單更新流程
1. 在 Google Sheets 中更新產品資料
2. 確認資料格式正確：
   - A欄：產品編號
   - B欄：產品名稱
   - C欄：顏色/規格（可選）
   - D欄：單價（可選）

#### 2. 快取清理
```typescript
// 手動清理產品快取
const clearProductCache = async () => {
  const response = await fetch('/api/admin/clear-cache', {
    method: 'POST',
    credentials: 'include'
  });
  return response.json();
};
```

## 效能監控與調優

### 監控指標

#### 1. 應用程式效能
```typescript
// 在伺服器端監控關鍵指標
const monitorPerformance = () => {
  // 記憶體使用量
  const memUsage = process.memoryUsage();
  console.log('記憶體使用:', {
    rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB'
  });

  // CPU 使用率
  const cpuUsage = process.cpuUsage();
  console.log('CPU 使用:', cpuUsage);
};

// 每 5 分鐘執行一次
setInterval(monitorPerformance, 5 * 60 * 1000);
```

#### 2. 資料庫效能
```sql
-- 檢查慢查詢
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  rows
FROM pg_stat_statements
WHERE mean_time > 100  -- 超過 100ms 的查詢
ORDER BY mean_time DESC
LIMIT 10;
```

### 效能優化策略

#### 1. 前端優化
- 實施程式碼分割減少初始載入時間
- 優化圖片大小和格式
- 使用 CDN 分發靜態資源
- 啟用瀏覽器快取

#### 2. 後端優化
- 實施 Redis 快取熱門資料
- 優化資料庫查詢
- 使用連接池管理資料庫連線
- 啟用 Gzip 壓縮

#### 3. 資料庫優化
```sql
-- 分析表統計資訊
ANALYZE orders;
ANALYZE temp_orders;

-- 建立複合索引（如果需要）
CREATE INDEX idx_orders_status_date 
ON orders(status, delivery_date);
```

## 安全維護

### 安全檢查清單

#### 1. 身分驗證安全
- [ ] 檢查密碼複雜度要求
- [ ] 監控登入失敗次數
- [ ] 檢查 session 過期設定
- [ ] 確認 HTTPS 強制使用

#### 2. 資料安全
- [ ] 檢查資料庫存取權限
- [ ] 確認敏感資料加密
- [ ] 檢查 API 端點授權
- [ ] 驗證輸入資料清理

#### 3. 網路安全
- [ ] 檢查防火牆設定
- [ ] 確認 SSL 憑證有效
- [ ] 檢查 CORS 設定
- [ ] 監控異常流量

### 安全事件回應

#### 1. 可疑活動偵測
```typescript
// 監控登入失敗次數
const monitorFailedLogins = async () => {
  const failedAttempts = await redis.get('failed_login_attempts');
  if (parseInt(failedAttempts) > 10) {
    // 發送警告通知
    console.log('警告：偵測到異常登入嘗試');
    // 可以實施 IP 封鎖或其他安全措施
  }
};
```

#### 2. 緊急回應程序
1. **識別威脅**：確認安全事件性質和範圍
2. **隔離系統**：暫時限制或關閉受影響服務
3. **評估損害**：檢查資料完整性和系統狀態
4. **修復漏洞**：實施安全修補或設定調整
5. **恢復服務**：逐步恢復正常運作
6. **事後檢討**：分析事件原因並改進安全措施

## 備份與災難恢復

### 備份策略

#### 1. 自動備份設定
- **Supabase 自動備份**：每日備份，保留 7 天
- **程式碼備份**：Git 版本控制，推送到多個儲存庫
- **設定檔備份**：加密儲存重要設定

#### 2. 手動備份程序
```bash
# 建立完整備份
backup_date=$(date +%Y%m%d_%H%M%S)

# 備份資料庫
supabase db dump --file "backup_db_${backup_date}.sql"

# 備份程式碼
git archive --format=zip --output="backup_code_${backup_date}.zip" HEAD

# 備份環境變數（注意安全性）
cp .env "backup_env_${backup_date}.env"
```

### 災難恢復計畫

#### 1. 恢復時間目標 (RTO)
- **關鍵系統**：2 小時內恢復
- **一般功能**：24 小時內恢復
- **歷史資料**：72 小時內恢復

#### 2. 恢復點目標 (RPO)
- **資料遺失**：最多 1 小時
- **設定變更**：最多 24 小時

#### 3. 恢復程序
```bash
# 1. 評估損害範圍
echo "開始災難恢復程序..."

# 2. 建立新的 Supabase 專案（如果需要）
supabase projects create new-project-name

# 3. 恢復資料庫
supabase db reset --file backup_db_latest.sql

# 4. 部署應用程式
npm run build
npm run deploy

# 5. 更新 DNS 設定（如果需要）
# 6. 測試所有功能
npm run test:e2e

echo "災難恢復完成"
```

## 系統升級指南

### 依賴套件更新

#### 1. 安全更新
```bash
# 檢查安全漏洞
npm audit

# 自動修復可修復的漏洞
npm audit fix

# 手動檢查高風險漏洞
npm audit --audit-level high
```

#### 2. 主要版本升級
```bash
# 檢查過時的套件
npm outdated

# 更新次要版本
npm update

# 手動升級主要版本（需要測試）
npm install react@latest @types/react@latest
```

### 系統版本控制

#### 1. 版本號規則
採用語意化版本控制 (SemVer)：
- **主版本號**：不相容的 API 變更
- **次版本號**：向下相容的功能性新增
- **修訂號**：向下相容的問題修正

#### 2. 發布程序
```bash
# 1. 更新版本號
npm version patch  # 或 minor, major

# 2. 更新 CHANGELOG.md
echo "## [1.0.1] - $(date +%Y-%m-%d)" >> CHANGELOG.md

# 3. 建立 Git 標籤
git tag -a v1.0.1 -m "版本 1.0.1 發布"

# 4. 推送到儲存庫
git push origin main --tags
```

## 疑難排解

### 常見問題診斷

#### 1. 應用程式無法啟動
```bash
# 檢查 Node.js 版本
node --version

# 檢查依賴安裝
npm list --depth=0

# 檢查環境變數
echo $DATABASE_URL
echo $SUPABASE_URL

# 檢查連接埠使用
lsof -i :5000
```

#### 2. 資料庫連線問題
```typescript
// 測試資料庫連線
const testConnection = async () => {
  try {
    const result = await db.execute('SELECT 1');
    console.log('資料庫連線正常');
  } catch (error) {
    console.error('資料庫連線失敗:', error.message);
  }
};
```

#### 3. Google Sheets API 錯誤
```typescript
// 測試 API 連線
const testGoogleSheetsAPI = async () => {
  try {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/A1:B1?key=${API_KEY}`
    );
    if (response.ok) {
      console.log('Google Sheets API 連線正常');
    } else {
      console.error('API 回應錯誤:', response.status);
    }
  } catch (error) {
    console.error('API 連線失敗:', error.message);
  }
};
```

### 效能問題診斷

#### 1. 記憶體洩漏檢測
```bash
# 使用 Node.js 內建工具
node --inspect --inspect-brk server/index.js

# 在 Chrome DevTools 中連線到 Node.js 除錯器
# chrome://inspect
```

#### 2. 資料庫效能分析
```sql
-- 啟用查詢統計
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- 檢查表大小
SELECT 
  pg_size_pretty(pg_total_relation_size('orders')) as orders_size,
  pg_size_pretty(pg_total_relation_size('temp_orders')) as temp_orders_size;
```

---

**維護指南版本**: 1.0.0  
**最後更新**: 2024年5月30日  
**負責人**: 系統管理員  
**下次檢查**: 2024年6月30日