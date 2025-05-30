# 網頁專案文件標準規範指南

## 一、專案文件結構標準

### 1. 根目錄文件結構
```
project-root/
├── README.md                 # 專案總覽
├── CONTRIBUTING.md          # 貢獻指南
├── CHANGELOG.md             # 版本變更記錄
├── LICENSE                  # 授權文件
├── CODE_OF_CONDUCT.md       # 行為準則
├── SECURITY.md              # 安全政策
├── .github/                 # GitHub 相關設定
│   ├── ISSUE_TEMPLATE/      # Issue 模板
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── workflows/           # CI/CD 設定
├── docs/                    # 詳細文件
│   ├── README.md           # 文件索引
│   ├── getting-started.md  # 快速開始
│   ├── architecture.md     # 架構設計
│   ├── api/                # API 文件
│   ├── guides/             # 使用指南
│   └── deployment.md       # 部署指南
└── wiki/                    # 專案 Wiki
```

### 2. 技術文件結構
```
docs/
├── architecture/            # 架構文件
│   ├── overview.md         # 架構總覽
│   ├── frontend.md         # 前端架構
│   ├── backend.md          # 後端架構
│   ├── database.md         # 資料庫設計
│   └── infrastructure.md   # 基礎設施
├── api/                    # API 文件
│   ├── rest-api.md        # REST API 規格
│   ├── graphql-schema.md  # GraphQL Schema
│   └── websocket.md       # WebSocket 協議
├── development/            # 開發指南
│   ├── setup.md           # 開發環境設定
│   ├── coding-standards.md # 編碼規範
│   ├── testing.md         # 測試指南
│   └── debugging.md       # 除錯指南
└── deployment/             # 部署文件
    ├── requirements.md     # 系統需求
    ├── installation.md     # 安裝步驟
    ├── configuration.md    # 設定說明
    └── troubleshooting.md  # 疑難排解
```

## 二、主要文件規範

### 1. README.md (遵循 Standard Readme 規範)
```markdown
# 專案名稱

[![標準README](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)
[![建置狀態](https://img.shields.io/travis/user/repo.svg)](https://travis-ci.org/user/repo)
[![授權](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

> 簡短的專案描述

## 目錄

- [背景](#背景)
- [安裝](#安裝)
- [使用說明](#使用說明)
- [API](#api)
- [貢獻](#貢獻)
- [授權](#授權)

## 背景

詳細說明專案的背景、解決的問題、技術選擇等。

## 安裝

\```bash
npm install
\```

## 使用說明

\```javascript
// 程式碼範例
\```

## API

詳細的 API 說明或連結到 API 文件。

## 貢獻

請參閱 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 授權

[MIT](LICENSE) © 2024 Your Name
```

### 2. 架構文件 (遵循 C4 Model 或 ADR)

#### Architecture Decision Records (ADR)
```markdown
# ADR-001: 選擇 React 作為前端框架

## 狀態
已接受

## 背景
需要選擇一個現代化的前端框架來建構單頁應用程式。

## 決策
我們決定使用 React 18。

## 理由
- 大型社群支援
- 豐富的生態系統
- 優秀的效能
- 團隊熟悉度高

## 後果
- 需要學習 React Hooks
- 需要設定建置工具鏈
- 可以使用豐富的第三方套件
```

### 3. API 文件 (遵循 OpenAPI 3.0 規範)
```yaml
openapi: 3.0.0
info:
  title: 訂單管理 API
  version: 1.0.0
  description: 訂單管理系統的 RESTful API
paths:
  /orders:
    get:
      summary: 獲取訂單列表
      parameters:
        - name: status
          in: query
          schema:
            type: string
      responses:
        '200':
          description: 成功返回訂單列表
```

## 三、文件撰寫標準

### 1. Markdown 規範
- 遵循 [CommonMark](https://commonmark.org/) 規範
- 使用 [markdownlint](https://github.com/DavidAnson/markdownlint) 檢查格式

### 2. 程式碼文件 (JSDoc/TSDoc)
```typescript
/**
 * 計算訂單總金額
 * @param {Order} order - 訂單物件
 * @param {boolean} includeTax - 是否包含稅金
 * @returns {number} 訂單總金額
 * @example
 * ```typescript
 * const total = calculateOrderTotal(order, true);
 * ```
 */
export function calculateOrderTotal(order: Order, includeTax: boolean): number {
  // 實作內容
}
```

### 3. 元件文件 (Storybook)
```typescript
export default {
  title: 'Components/Button',
  component: Button,
  parameters: {
    docs: {
      description: {
        component: '基礎按鈕元件，支援多種樣式和狀態。'
      }
    }
  }
};
```

## 四、文件管理工具

### 1. 文件生成工具
- **Docusaurus**: Facebook 開發的文件網站生成器
- **VuePress**: Vue 驅動的靜態網站生成器
- **Docsify**: 輕量級文件網站生成器
- **MkDocs**: Python 靜態文件生成器

### 2. API 文件工具
- **Swagger UI**: OpenAPI 規範的互動式文件
- **Postman**: API 開發和文件平台
- **ReDoc**: OpenAPI 文件生成器
- **API Blueprint**: API 設計語言

### 3. 圖表工具
- **Mermaid**: Markdown 中的圖表
- **PlantUML**: 文字描述的 UML 圖
- **Draw.io**: 線上圖表工具
- **Excalidraw**: 手繪風格圖表

## 五、最佳實踐

### 1. 文件即程式碼 (Docs as Code)
```yaml
# .github/workflows/docs.yml
name: Deploy Docs
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Build docs
        run: npm run docs:build
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
```

### 2. 文件審查流程
- 文件變更需要 Pull Request
- 至少一位審查者
- 自動化文件檢查
- 版本控制追蹤變更

### 3. 文件更新原則
- **同步更新**: 程式碼變更時同步更新文件
- **定期審查**: 每季審查文件準確性
- **使用者回饋**: 收集並處理文件改進建議
- **版本對應**: 文件版本與軟體版本對應

## 六、常見文件類型模板

### 1. 安裝指南模板
```markdown
# 安裝指南

## 系統需求
- Node.js >= 14.0.0
- npm >= 6.0.0
- PostgreSQL >= 12.0

## 快速開始

### 1. 複製專案
\```bash
git clone https://github.com/username/project.git
cd project
\```

### 2. 安裝依賴
\```bash
npm install
\```

### 3. 環境設定
複製環境變數範例檔案：
\```bash
cp .env.example .env
\```

編輯 `.env` 檔案：
\```
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
API_KEY=your-api-key
\```

### 4. 資料庫設定
\```bash
npm run db:migrate
npm run db:seed
\```

### 5. 啟動應用程式
\```bash
npm run dev
\```

應用程式將在 http://localhost:3000 啟動。
```

### 2. API 端點文件模板
```markdown
## GET /api/orders

取得訂單列表。

### 請求參數

| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| page | number | 否 | 頁碼，預設為 1 |
| limit | number | 否 | 每頁筆數，預設為 20 |
| status | string | 否 | 訂單狀態篩選 |

### 請求範例
\```http
GET /api/orders?page=1&limit=10&status=completed
Authorization: Bearer <token>
\```

### 回應範例
\```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "ord_123",
        "status": "completed",
        "total": 1500,
        "createdAt": "2024-01-15T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "totalPages": 5,
      "totalItems": 50
    }
  }
}
\```

### 錯誤回應
- `400 Bad Request`: 無效的請求參數
- `401 Unauthorized`: 未授權
- `500 Internal Server Error`: 伺服器錯誤
```

## 七、文件品質檢查清單

- [ ] **完整性**: 涵蓋所有功能和 API
- [ ] **準確性**: 與實際程式碼同步
- [ ] **清晰度**: 易於理解，避免專業術語
- [ ] **一致性**: 格式和術語統一
- [ ] **可搜尋**: 良好的結構和索引
- [ ] **範例豐富**: 提供實際使用範例
- [ ] **視覺輔助**: 包含圖表和截圖
- [ ] **更新日期**: 標註最後更新時間
- [ ] **聯絡資訊**: 提供問題回報管道
- [ ] **多語言**: 考慮國際化需求