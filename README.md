# 訂單管理系統

一個安全的動態訂單管理系統，具有完整的管理功能，設計用於提供健全的追蹤、監控和複雜訂單工作流程管理。

## 主要功能

- 以TypeScript編寫的React前端
- 多層身份驗證系統
- 進階訂單處理與細粒度追蹤
- 實時數據可視化和報告
- 增強的安全協議
- 靈活的系統配置管理

## 環境需求

- Node.js 20或更高版本
- PostgreSQL (可選用Supabase)
- 有效的Google表單API密鑰和表單ID

## 本地安裝和使用方法

### 1. 複製倉庫

```bash
git clone [倉庫URL]
cd [倉庫目錄]
```

### 2. 安裝依賴

```bash
npm install
```

### 3. 配置環境變數

複製`.env.example`到`.env`並填入您的實際環境值：

```bash
cp .env.example .env
```

編輯`.env`文件以包含：
- Supabase URL和密鑰
- Google Spreadsheet API密鑰和表單ID
- PostgreSQL數據庫連接字符串
- 管理員密碼

### 4. 啟動開發服務器

```bash
npm run dev
```

應用程序將在`http://localhost:5000`啟動。

## 數據庫初始化

系統使用了PostgreSQL資料庫，如果您想要本地開發而不使用Supabase，您可以：

```bash
# 確保PostgreSQL已安裝並運行
npm run db:push
```

這將根據`shared/schema.ts`中的定義創建所有必要的資料表。

## 環境變數說明

- `DATABASE_URL`: PostgreSQL連接字符串
- `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`: PostgreSQL連接詳情
- `SUPABASE_URL`: Supabase項目URL
- `SUPABASE_KEY`: Supabase客戶端密鑰
- `SPREADSHEET_API_KEY`: Google API密鑰，用於訪問表單
- `SPREADSHEET_ID`: Google表單的唯一ID
- `ADMIN_PASSWORD`: 管理員登入密碼

## 重要說明

- 系統默認有10分鐘的管理員會話超時
- 臨時訂單需要由管理員確認才會變為已完成訂單
- 所有API密鑰和密碼都應安全存放，不應公開分享