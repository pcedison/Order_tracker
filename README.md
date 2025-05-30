# 達遠訂單管理系統 Pro

[![建置狀態](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://replit.com)
[![授權](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![版本](https://img.shields.io/badge/version-2.0.0-blue.svg)](CHANGELOG.md)

> 現代化的企業級訂單管理系統，提供安全的多層級身分驗證和智能化使用者體驗

## 目錄

- [背景](#背景)
- [功能特色](#功能特色)
- [技術架構](#技術架構)
- [快速開始](#快速開始)
- [系統需求](#系統需求)
- [安裝指南](#安裝指南)
- [使用說明](#使用說明)
- [API 文件](#api-文件)
- [部署指南](#部署指南)
- [維護指南](#維護指南)
- [故障排除](#故障排除)
- [貢獻指南](#貢獻指南)
- [授權](#授權)

## 背景

達遠訂單管理系統是一個為企業設計的現代化訂單處理平台，解決了傳統訂單管理系統在安全性、使用者體驗和效能方面的痛點。系統採用漸進式 Web 應用（PWA）架構，支援響應式設計和離線功能。

### 解決的核心問題
- **安全性不足**：傳統系統缺乏多層級身分驗證
- **使用者體驗差**：介面過時，操作複雜
- **資料同步困難**：不同權限用戶的資料可見性問題
- **維護困難**：缺乏統一的狀態管理和錯誤處理

## 功能特色

### 🔐 多層級身分驗證
- **訪客模式**：可建立訂單和查看近 3 個月完成訂單
- **會員模式**：可查看近 1 年歷史訂單
- **管理員模式**：完整系統管控和所有歷史資料存取

### 📊 智能化資料分析
- 實時統計儀表板
- 月份和年度訂單分析
- 自動化報表生成（PDF 匯出）
- 動態數據視覺化

### 🎨 現代化 UI/UX
- Glass morphism 設計語言
- 響應式佈局（支援桌面/平板/手機）
- 暗黑/明亮主題切換
- 3D 按鈕效果和流暢動畫

### 🔄 即時同步
- 全局狀態管理
- 即時通知系統
- 自動資料重新整理
- 離線功能支援

## 技術架構

### 前端技術棧
- **React 18**：現代化前端框架
- **TypeScript**：類型安全的 JavaScript
- **Tailwind CSS**：原子化 CSS 框架
- **Shadcn/ui**：高品質 UI 元件庫
- **TanStack Query**：資料獲取和狀態管理
- **Wouter**：輕量級路由解決方案

### 後端技術棧
- **Node.js + Express**：伺服器端運行環境
- **TypeScript**：全棧類型安全
- **Drizzle ORM**：現代化資料庫 ORM
- **PostgreSQL**：關聯式資料庫
- **Supabase**：後端即服務平台

### 開發工具
- **Vite**：快速建置工具
- **ESLint + Prettier**：程式碼品質控制
- **Husky**：Git hooks 管理
- **Jest**：單元測試框架

## 系統需求

### 開發環境
- Node.js >= 18.0.0
- npm >= 9.0.0 或 yarn >= 1.22.0
- PostgreSQL >= 14.0（或 Supabase 帳號）
- Git >= 2.30.0

### 生產環境
- 記憶體：最少 1GB RAM
- 儲存空間：最少 2GB
- 網路：支援 HTTPS
- 瀏覽器：Chrome 90+, Firefox 88+, Safari 14+

## 快速開始

### 1. 複製專案
```bash
git clone <repository-url>
cd dayuan-order-system
```

### 2. 安裝依賴
```bash
npm install
```

### 3. 環境設定
```bash
cp .env.example .env
```

編輯 `.env` 檔案：
```env
# Supabase 設定
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key

# 資料庫設定
DATABASE_URL=postgresql://user:password@localhost:5432/database

# Google Sheets API（產品價格查詢）
GOOGLE_SHEETS_API_KEY=your-google-api-key
GOOGLE_SHEETS_ID=your-spreadsheet-id

# 會話密鑰
SESSION_SECRET=your-session-secret
```

### 4. 資料庫初始化
```bash
npm run db:push
npm run db:seed
```

### 5. 啟動開發伺服器
```bash
npm run dev
```

應用程式將在 http://localhost:5000 啟動。

## 使用說明

### 基本操作流程

#### 1. 建立新訂單
1. 在主頁點擊「新增訂單」
2. 搜尋並選擇產品
3. 設定交貨日期和數量
4. 確認訂單資訊並提交

#### 2. 管理訂單
1. 在「訂單列表」查看待處理訂單
2. 編輯訂單數量或交貨日期
3. 標記訂單為已完成
4. 刪除錯誤訂單

#### 3. 歷史查詢
1. 進入「歷史訂單」頁面
2. 使用搜尋功能篩選特定訂單
3. 根據權限查看不同時間範圍的資料

#### 4. 管理員功能
1. 點擊設定齒輪選擇「管理員登入」
2. 輸入管理員密碼
3. 存取系統配置和完整管理功能

### 權限說明

| 使用者類型 | 可建立訂單 | 歷史查詢範圍 | 管理功能 |
|------------|------------|-------------|----------|
| 訪客       | ✅         | 近 3 個月   | ❌       |
| 會員       | ✅         | 近 1 年     | ❌       |
| 管理員     | ✅         | 無限制      | ✅       |

## API 文件

### 認證端點

#### POST /api/auth/login
管理員登入
```json
{
  "password": "admin-password"
}
```

#### POST /api/auth/logout
登出系統

#### GET /api/auth/status
檢查登入狀態

### 訂單端點

#### GET /api/orders
取得訂單列表
- Query 參數：
  - `status`: "temporary" | "completed"
  - `page`: 頁碼
  - `limit`: 每頁筆數

#### POST /api/orders
建立新訂單
```json
{
  "productCode": "PROD-001",
  "productName": "產品名稱",
  "quantity": 100,
  "deliveryDate": "2024-12-31"
}
```

#### PUT /api/orders/:id
更新訂單

#### DELETE /api/orders/:id
刪除訂單

### 產品端點

#### GET /api/products
取得產品列表
- Query 參數：
  - `search`: 搜尋關鍵字

### 統計端點

#### GET /api/stats/:year/:month?
取得統計資料

完整 API 文件請參考：[docs/api/README.md](docs/api/README.md)

## 部署指南

### Replit 部署（推薦）
1. 在 Replit 中匯入專案
2. 設定環境變數
3. 點擊「Deploy」按鈕
4. 系統會自動建置和部署

### 手動部署
1. 建置生產版本：
```bash
npm run build
```

2. 設定環境變數
3. 啟動生產伺服器：
```bash
npm start
```

### Docker 部署
```bash
docker build -t dayuan-order-system .
docker run -p 5000:5000 dayuan-order-system
```

## 維護指南

### 日常維護
- **資料備份**：每日自動備份 Supabase 資料庫
- **日誌監控**：檢查應用程式和錯誤日誌
- **效能監控**：監控回應時間和記憶體使用量
- **安全更新**：定期更新依賴套件

### 密碼管理
管理員密碼使用 PBKDF2 加密儲存在 Supabase：
```sql
-- 查看加密配置
SELECT key, value FROM configs WHERE key = 'admin_password';
```

### 資料庫維護
```bash
# 備份資料庫
npm run db:backup

# 執行遷移
npm run db:migrate

# 檢查資料庫狀態
npm run db:status
```

### 更新 Google Sheets 設定
1. 登入 Google Sheets 管理控制台
2. 更新產品清單和價格資訊
3. 確認 API 金鑰權限

## 故障排除

### 常見問題

#### 1. 無法連接資料庫
**問題**：Application startup error
**解決方案**：
1. 檢查 `DATABASE_URL` 環境變數
2. 確認 Supabase 服務狀態
3. 檢查網路連線

#### 2. Google Sheets API 錯誤
**問題**：產品搜尋失敗
**解決方案**：
1. 檢查 `GOOGLE_SHEETS_API_KEY` 設定
2. 確認試算表分享權限
3. 檢查 API 配額使用狀況

#### 3. 管理員登入問題
**問題**：密碼正確但無法登入
**解決方案**：
1. 清除瀏覽器緩存
2. 檢查 session 配置
3. 重新設定管理員密碼

#### 4. 前端建置錯誤
**問題**：Vite build 失敗
**解決方案**：
```bash
# 清除緩存
rm -rf node_modules dist
npm install
npm run build
```

### 日誌檢查
```bash
# 檢查應用程式日誌
tail -f logs/app.log

# 檢查錯誤日誌
tail -f logs/error.log
```

### 效能調優
1. **資料庫查詢優化**：添加適當索引
2. **緩存策略**：使用 Redis 快取常用資料
3. **圖片優化**：壓縮靜態資源
4. **CDN 配置**：使用內容分發網路

## 貢獻指南

### 開發流程
1. Fork 專案到個人帳號
2. 建立功能分支：`git checkout -b feature/new-feature`
3. 提交變更：`git commit -m "Add new feature"`
4. 推送分支：`git push origin feature/new-feature`
5. 建立 Pull Request

### 程式碼規範
- 遵循 ESLint 設定
- 使用 TypeScript 類型註解
- 寫單元測試覆蓋新功能
- 更新相關文件

### 測試
```bash
# 執行所有測試
npm test

# 執行特定測試
npm test -- --grep "OrderForm"

# 檢查測試覆蓋率
npm run test:coverage
```

## 授權

MIT © 2024 達遠訂單管理系統

詳細授權條款請參考 [LICENSE](LICENSE) 檔案。

---

## 技術支援

如有任何問題或建議，請：
1. 查閱 [常見問題](docs/FAQ.md)
2. 搜尋 [Issues](../../issues)
3. 建立新的 [Issue](../../issues/new)
4. 聯繫技術支援：support@dayuan.com

**最後更新**：2024年5月30日
**文件版本**：2.0.0