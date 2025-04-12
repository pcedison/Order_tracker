# 訂單管理系統的部署和本地開發指南

## 總覽

本文檔提供從Replit下載此應用程序並在本地開發環境中運行的詳細步驟，同時保持連接到現有的Supabase數據庫和Google Spreadsheet。

## 一、準備工作

### 必要條件
- [Node.js](https://nodejs.org/) v20或更高版本
- [Git](https://git-scm.com/)
- 有效的Supabase帳戶和現有項目
- 有效的Google API密鑰和已配置的Spreadsheet

### 獲取環境變數
在下載代碼前，請確保您已獲取所有必要的環境變數：

1. 從Replit環境中獲取當前的環境變數：
   - SUPABASE_URL
   - SUPABASE_KEY
   - SPREADSHEET_API_KEY
   - SPREADSHEET_ID
   - ADMIN_PASSWORD
   - DATABASE_URL（如果使用Supabase的PostgreSQL數據庫）

2. 如果需要，從Supabase管理面板獲取數據庫連接詳情：
   - PGHOST
   - PGPORT
   - PGUSER
   - PGPASSWORD
   - PGDATABASE

## 二、下載代碼

### 選項1：使用Replit的"下載Zip"功能

1. 在Replit專案界面，點擊左上角的三個點（⋯）
2. 選擇"下載Zip"
3. 解壓下載的文件到您的本地開發文件夾

### 選項2：使用Git（推薦）

如果您想使用Git進行版本控制，請按照以下步驟操作：

1. 在Replit中創建一個新的私有GitHub倉庫：
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/your-repo-name.git
   git push -u origin main
   ```

2. 在本地機器上克隆該倉庫：
   ```bash
   git clone https://github.com/yourusername/your-repo-name.git
   cd your-repo-name
   ```

## 三、設置本地環境

1. **安裝依賴**
   ```bash
   npm install
   ```
   
   確保同時安裝 `dotenv` 以處理環境變數：
   ```bash
   npm install dotenv
   ```

2. **創建環境變數文件**
   
   複製 `.env.example` 文件並編輯為您的值：
   ```bash
   cp .env.example .env
   ```
   
   編輯 `.env` 文件，填入您之前收集的所有環境變數：
   ```
   # 數據庫配置
   DATABASE_URL=your_supabase_postgresql_connection_string
   PGHOST=your_supabase_db_host
   PGPORT=your_supabase_db_port
   PGUSER=your_supabase_db_user
   PGPASSWORD=your_supabase_db_password
   PGDATABASE=your_supabase_db_name
   
   # Supabase配置
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_anon_key
   
   # Google Spreadsheet配置
   SPREADSHEET_API_KEY=your_google_api_key
   SPREADSHEET_ID=your_spreadsheet_id
   
   # 管理員密碼配置
   ADMIN_PASSWORD=your_admin_password
   ```

3. **添加數據庫設置腳本**
   
   在您的 `package.json` 的 `scripts` 部分添加：
   ```json
   "db:setup": "node scripts/db-setup.js"
   ```

4. **運行數據庫設置腳本**
   ```bash
   npm run db:setup
   ```
   
   這將檢查您的數據庫連接並設置必要的表（如果它們不存在）。

## 四、啟動和開發

### 啟動開發服務器
```bash
npm run dev
```

應用程序將在 `http://localhost:5000` 啟動。

### 建置生產版本
```bash
npm run build
```

### 運行生產版本
```bash
npm start
```

## 五、代碼結構說明

```
/
├── client/                 # 前端React應用
│   ├── src/
│   │   ├── components/     # UI组件
│   │   ├── hooks/          # 自定義React鉤子
│   │   ├── lib/            # 共享工具和類型
│   │   ├── pages/          # 頁面組件
│   │   ├── App.tsx         # 主應用組件
│   │   └── main.tsx        # 應用入口點
│   └── index.html          # HTML模板
├── server/                 # 後端Express服務
│   ├── services/           # 業務邏輯服務
│   ├── index.ts            # 服務器入口點
│   ├── routes.ts           # API路由定義
│   ├── storage.ts          # 數據存儲層
│   ├── db.ts               # 數據庫連接
│   ├── supabase.ts         # Supabase客戶端
│   └── vite.ts             # Vite開發服務器集成
├── shared/                 # 前後端共享代碼
│   └── schema.ts           # 數據庫模式和類型
├── scripts/                # 實用腳本
│   └── db-setup.js         # 數據庫設置腳本
├── .env.example            # 環境變數模板
├── .gitignore              # Git忽略規則
├── LOCAL_SETUP.md          # 本地設置詳細指南
├── DEPLOYMENT.md           # 此部署文檔
├── README.md               # 項目概述
├── drizzle.config.ts       # Drizzle ORM配置
├── package.json            # 項目依賴和腳本
├── tailwind.config.ts      # Tailwind CSS配置
└── vite.config.ts          # Vite配置
```

## 六、注意事項

### 使用遠程Supabase

本指南假設您將繼續使用遠程Supabase數據庫。這意味著：

1. 所有數據將繼續存儲在Supabase中
2. 您需要確保您的Supabase項目保持可訪問狀態
3. 本地應用程序將需要互聯網連接才能正常工作

如果您想完全脫離Supabase並使用本地PostgreSQL：
1. 安裝本地PostgreSQL服務器
2. 更新環境變數以指向本地數據庫
3. 運行 `npm run db:push` 創建所有必要的表

### 更新Google Spreadsheet連接

確保您的Google Spreadsheet API密鑰和Spreadsheet ID正確設置在 `.env` 文件中。如果您想使用不同的產品表單：

1. 確保表單具有相同的數據結構（產品代碼、名稱等）
2. 更新 `SPREADSHEET_ID` 環境變數指向新表單

### 管理員會話超時

系統配置為在用戶10分鐘不活動後自動登出管理員會話。此行為由以下部分控制：

1. 客戶端計時器（在 `useAdmin.ts` 中）
2. 服務器會話設置（在 `routes.ts` 中）

如果您想更改此超時時間，需要在兩個地方都進行修改。

## 七、故障排除

### 常見問題

1. **無法連接到Supabase數據庫**
   - 檢查您的數據庫連接字符串是否正確
   - 確認IP白名單設置
   - 驗證數據庫用戶權限

2. **產品列表不加載**
   - 檢查Google API密鑰是否有效
   - 確認Spreadsheet ID是否正確
   - 確保Spreadsheet有適當的共享設置

3. **管理員登錄失敗**
   - 確認 `.env` 中的 `ADMIN_PASSWORD` 與Supabase中的哈希值匹配
   - 檢查服務器日誌是否有身份驗證錯誤

4. **自動登出過快或不正常**
   - 檢查系統時間是否同步
   - 確認會話超時設置是否一致

如果遇到其他問題，請檢查服務器日誌獲取詳細錯誤信息。

## 八、聯絡與支持

如有任何問題或需要進一步協助，請聯絡專案管理員。