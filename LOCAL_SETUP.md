# 本地開發設置指南

本文檔提供了如何在本地環境中設置和運行此訂單管理系統的詳細步驟。

## 前提條件

- [Node.js](https://nodejs.org/) (v20或更高版本)
- [Git](https://git-scm.com/)
- [npm](https://www.npmjs.com/) (通常隨Node.js安裝)
- 有效的Supabase帳戶和項目
- 有效的Google API密鑰和Spreadsheet

## 第1步：從Replit下載代碼

從Replit下載整個專案的代碼。有幾種方法可以做到：

1. 使用Replit的"下載為zip"功能
2. 或者，如果你使用Git：
   - 在Replit上設置Git倉庫
   - 將代碼推送到GitHub
   - 然後克隆到本地機器

```bash
git clone https://github.com/your-username/your-repo-name.git
cd your-repo-name
```

## 第2步：安裝依賴

安裝所有必要的Node.js包：

```bash
npm install
```

另外，確保你添加了dotenv包來處理環境變數：

```bash
npm install dotenv
```

## 第3步：設置環境變數

1. 複製提供的`.env.example`文件並創建一個新的`.env`文件：

```bash
cp .env.example .env
```

2. 編輯`.env`文件，填入您的實際憑證和配置值：

```
# 數據庫配置
DATABASE_URL=postgres://username:password@host:port/database
PGHOST=your_pg_host
PGPORT=your_pg_port
PGUSER=your_pg_username
PGPASSWORD=your_pg_password
PGDATABASE=your_pg_database_name

# Supabase配置
SUPABASE_URL=https://yourproject.supabase.co
SUPABASE_KEY=your_supabase_anon_key

# Google Spreadsheet配置
SPREADSHEET_API_KEY=your_google_api_key
SPREADSHEET_ID=your_spreadsheet_id

# 管理員密碼配置
ADMIN_PASSWORD=your_admin_password
```

## 第4步：設置數據庫

我們提供了一個數據庫設置腳本。在您的package.json中添加以下腳本：

```json
"scripts": {
  "db:setup": "node scripts/db-setup.js"
}
```

然後運行設置腳本：

```bash
npm run db:setup
```

這將：
- 檢查數據庫連接
- 創建必要的表（如果它們不存在）
- 初始化基本配置

如果數據庫表結構不存在，您還需要運行：

```bash
npm run db:push
```

這將根據`shared/schema.ts`中的定義創建所有必要的數據庫表。

## 第5步：啟動應用程序

啟動開發服務器：

```bash
npm run dev
```

應用程序將在 http://localhost:5000 啟動。

## 使用說明

### 使用Supabase

該應用程序配置為使用Supabase作為後端服務。確保您的Supabase項目已正確設置，包括：

1. 已啟用的數據庫（使用提供的schema.ts模型）
2. 正確的RLS（行級安全）策略
3. 對所有表的適當訪問權限

### 使用Google Spreadsheet

產品信息是從Google Spreadsheet獲取的。確保：

1. 您的Google API密鑰有權限訪問Google Sheets API
2. 指定的Spreadsheet ID對應於包含產品數據的表格
3. 表格格式與應用程序預期的格式相符

### 管理員功能

要訪問管理員功能：

1. 點擊頁面上的"管理員登錄"按鈕
2. 使用在`.env`中設置的密碼登錄
3. 管理員會話將在10分鐘無活動後自動過期

## 故障排除

### 數據庫連接問題

如果遇到數據庫連接問題：

1. 確保PostgreSQL服務器正在運行
2. 驗證`.env`中的連接字符串是否正確
3. 檢查PostgreSQL用戶是否有適當的權限

### API密鑰問題

如果Google Spreadsheet API或Supabase連接失敗：

1. 確認API密鑰是否有效且未過期
2. 檢查是否具有正確的訪問權限
3. 驗證服務是否可用且沒有中斷

### 表單不顯示

如果產品表單不加載：

1. 檢查瀏覽器控制台是否有錯誤
2. 驗證Google Spreadsheet API密鑰和ID是否正確
3. 確保Spreadsheet具有適當的權限設置（通常設為"公開"）

## 注意事項

- 會話在PostgreSQL中持久存儲，以確保系統重啟後的會話復原
- 環境變數作為配置備份存儲在數據庫中，但仍建議在`.env`中設置它們
- 系統設計為在本地和遠程環境中都能工作，只需相應地設置環境變數