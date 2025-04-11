# 訂單管理系統

一個安全且動態的訂單管理系統，具有全面的管理員功能，用於提供強大的追蹤、監控和管理複雜訂單工作流程的能力。

## 主要功能

- 使用 TypeScript 的 React 前端
- 多級身份驗證系統
- 高級訂單處理與細粒度追蹤
- 實時數據可視化和報告
- 增強的安全協議
- 靈活的系統配置管理
- 管理員會話自動超時（5分鐘）
- PostgreSQL 數據庫支持

## 技術棧

- 前端: React, TypeScript, TailwindCSS, shadcn/ui
- 後端: Node.js, Express.js
- 數據庫: PostgreSQL
- ORM: Drizzle ORM
- 外部服務: Supabase, Google Sheets API

## 安裝和設置

### 前提條件

- Node.js (v18+)
- PostgreSQL 數據庫
- Supabase 帳戶
- Google Cloud Platform 帳戶（用於 Sheets API）

### 安裝步驟

1. 克隆存儲庫:
   ```bash
   git clone https://github.com/yourusername/order-management-system.git
   cd order-management-system
   ```

2. 安裝依賴:
   ```bash
   npm install
   ```

3. 環境變數配置:
   - 複製 `.env.example` 到 `.env`
   - 填入您的實際配置值

4. 初始化數據庫:
   ```bash
   npm run db:push
   ```

5. 啟動開發服務器:
   ```bash
   npm run dev
   ```

## 使用說明

### 基本功能

- **查詢產品**: 使用者可以從 Google Sheets 中查詢產品信息
- **創建臨時訂單**: 使用者可以創建臨時訂單
- **編輯訂單**: 修改訂單的數量和交付日期

### 管理員功能

- **完成訂單**: 將臨時訂單標記為已完成
- **查看歷史訂單**: 查看和管理已完成的訂單
- **訂單統計**: 查看月度和年度訂單統計
- **系統配置**: 更新系統連接設置和管理員密碼

## 數據庫結構

系統使用以下主要數據表:

- `users`: 用戶信息
- `orders`: 訂單基本信息
- `configs`: 系統配置
- `session`: 會話管理

## 安全特性

- 所有敏感信息存儲在環境變量中
- 數據庫認證和授權
- 管理員密碼使用 SHA-256 哈希
- HttpOnly cookie 用於會話管理
- 5分鐘無操作自動登出管理員
- 會話數據持久化到 PostgreSQL

## 貢獻指南

1. Fork 存儲庫
2. 創建您的功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的變更 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟一個 Pull Request

## 許可證

[MIT](LICENSE)

## 聯繫方式

您的姓名 - [您的郵箱地址](mailto:your.email@example.com)

項目鏈接: [https://github.com/yourusername/order-management-system](https://github.com/yourusername/order-management-system)