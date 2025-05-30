# API 文件

## 概覽

達遠訂單管理系統提供 RESTful API，支援訂單管理、產品查詢、身分驗證和統計分析功能。所有 API 回應均為 JSON 格式。

## 基礎設定

### Base URL
```
https://your-domain.replit.app/api
```

### 內容類型
```
Content-Type: application/json
```

### 身分驗證
系統使用 session-based 身分驗證。管理員功能需要先透過 `/auth/login` 登入。

## 身分驗證端點

### POST /auth/login
管理員登入系統

**請求主體**
```json
{
  "password": "管理員密碼"
}
```

**回應範例**
```json
{
  "success": true,
  "sessionId": "abc123...",
  "message": "登入成功"
}
```

**錯誤回應**
```json
{
  "success": false,
  "error": "密碼錯誤"
}
```

### POST /auth/logout
登出系統

**回應範例**
```json
{
  "success": true,
  "message": "登出成功"
}
```

### GET /auth/status
檢查當前登入狀態

**回應範例**
```json
{
  "authenticated": true,
  "sessionId": "abc123...",
  "loginTime": "2024-05-30T10:00:00Z"
}
```

## 訂單管理端點

### GET /orders
取得訂單列表

**查詢參數**
| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| status | string | 否 | 訂單狀態：`temporary` 或 `completed` |
| page | number | 否 | 頁碼，預設為 1 |
| limit | number | 否 | 每頁筆數，預設為 20 |

**請求範例**
```http
GET /api/orders?status=temporary&page=1&limit=10
```

**回應範例**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "productCode": "99-9525",
      "productName": "紅色產品",
      "quantity": 25,
      "deliveryDate": "2024-06-15",
      "status": "temporary",
      "createdAt": "2024-05-30T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "totalPages": 5
  }
}
```

### POST /orders
建立新訂單

**請求主體**
```json
{
  "productCode": "99-9525",
  "productName": "紅色產品",
  "quantity": 25,
  "deliveryDate": "2024-06-15"
}
```

**回應範例**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "productCode": "99-9525",
    "productName": "紅色產品",
    "quantity": 25,
    "deliveryDate": "2024-06-15",
    "status": "temporary",
    "createdAt": "2024-05-30T11:00:00Z"
  }
}
```

### PUT /orders/:id
更新現有訂單

**路徑參數**
- `id`: 訂單 UUID

**請求主體**
```json
{
  "quantity": 30,
  "deliveryDate": "2024-06-20"
}
```

**回應範例**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "quantity": 30,
    "deliveryDate": "2024-06-20",
    "updatedAt": "2024-05-30T12:00:00Z"
  }
}
```

### DELETE /orders/:id
刪除訂單

**路徑參數**
- `id`: 訂單 UUID

**回應範例**
```json
{
  "success": true,
  "message": "訂單已刪除"
}
```

### POST /orders/:id/complete
完成訂單

**路徑參數**
- `id`: 訂單 UUID

**回應範例**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "status": "completed",
    "completedAt": "2024-05-30T13:00:00Z"
  }
}
```

### GET /orders/history
取得歷史訂單

**查詢參數**
| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| startDate | string | 否 | 開始日期 (YYYY-MM-DD) |
| endDate | string | 否 | 結束日期 (YYYY-MM-DD) |
| search | string | 否 | 搜尋產品編號或名稱 |
| page | number | 否 | 頁碼，預設為 1 |
| limit | number | 否 | 每頁筆數，預設為 30 |

**回應範例**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440003",
      "productCode": "1006",
      "productName": "藍色產品",
      "quantity": 15,
      "deliveryDate": "2024-05-25",
      "status": "completed",
      "completedAt": "2024-05-25T14:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 30,
    "total": 120,
    "totalPages": 4
  }
}
```

## 產品管理端點

### GET /products
取得產品列表

**查詢參數**
| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| search | string | 否 | 搜尋產品編號或名稱 |
| limit | number | 否 | 回傳筆數限制，預設為 50 |

**請求範例**
```http
GET /api/products?search=紅&limit=10
```

**回應範例**
```json
{
  "success": true,
  "data": [
    {
      "code": "99-9525",
      "name": "紅色產品",
      "color": "紅",
      "price": 150.00
    },
    {
      "code": "99-9526",
      "name": "紅色特殊款",
      "color": "紅",
      "price": 180.00
    }
  ]
}
```

### GET /products/:code/price
取得特定產品價格

**路徑參數**
- `code`: 產品編號

**回應範例**
```json
{
  "success": true,
  "data": {
    "productCode": "99-9525",
    "price": 150.00,
    "lastUpdated": "2024-05-30T08:00:00Z"
  }
}
```

## 統計分析端點

### GET /stats/:year/:month?
取得統計資料

**路徑參數**
- `year`: 年份 (YYYY)
- `month`: 月份 (MM)，可選

**查詢參數**
| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| format | string | 否 | 回應格式：`json` 或 `pdf` |

**請求範例**
```http
GET /api/stats/2024/05
```

**回應範例**
```json
{
  "success": true,
  "data": {
    "period": "2024年5月",
    "totalOrders": 45,
    "totalKilograms": 1125.5,
    "totalAmount": 168825.00,
    "stats": [
      {
        "code": "99-9525",
        "name": "紅色產品",
        "totalQuantity": 125,
        "orderCount": 8,
        "unitPrice": 150.00,
        "totalPrice": 18750.00
      }
    ]
  }
}
```

### GET /stats/:year/:month/export
匯出統計報表 (PDF)

**路徑參數**
- `year`: 年份 (YYYY)
- `month`: 月份 (MM)

**回應**: PDF 檔案下載

## 系統管理端點

### GET /config
取得系統配置（需要管理員權限）

**回應範例**
```json
{
  "success": true,
  "data": {
    "googleSheetsId": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
    "adminEmail": "pcedison@gmail.com",
    "lastPasswordUpdate": "2024-05-30T09:00:00Z"
  }
}
```

### PUT /config/:key
更新系統配置（需要管理員權限）

**路徑參數**
- `key`: 配置項目名稱

**請求主體**
```json
{
  "value": "新的配置值"
}
```

**回應範例**
```json
{
  "success": true,
  "message": "配置已更新"
}
```

### POST /admin/clear-cache
清除系統快取（需要管理員權限）

**回應範例**
```json
{
  "success": true,
  "message": "快取已清除"
}
```

## 錯誤處理

### 錯誤回應格式
```json
{
  "success": false,
  "error": "錯誤描述",
  "code": "ERROR_CODE",
  "details": {
    "field": "具體錯誤欄位",
    "message": "詳細錯誤訊息"
  }
}
```

### 常見錯誤代碼

| HTTP 狀態碼 | 錯誤代碼 | 說明 |
|-------------|----------|------|
| 400 | INVALID_REQUEST | 請求格式錯誤 |
| 401 | UNAUTHORIZED | 未授權存取 |
| 403 | FORBIDDEN | 禁止存取 |
| 404 | NOT_FOUND | 資源不存在 |
| 409 | CONFLICT | 資源衝突 |
| 422 | VALIDATION_ERROR | 資料驗證失敗 |
| 429 | RATE_LIMIT | 請求頻率過高 |
| 500 | INTERNAL_ERROR | 內部伺服器錯誤 |

### 驗證錯誤範例
```json
{
  "success": false,
  "error": "資料驗證失敗",
  "code": "VALIDATION_ERROR",
  "details": {
    "quantity": "數量必須大於 0",
    "deliveryDate": "交貨日期不能是過去的日期"
  }
}
```

## 速率限制

API 實施速率限制以防止濫用：

- **一般端點**: 每分鐘 100 次請求
- **認證端點**: 每分鐘 10 次請求
- **統計端點**: 每分鐘 20 次請求

超過限制時會回傳 HTTP 429 狀態碼。

## API 版本控制

目前 API 版本為 v1。未來版本更新將透過 URL 路徑指定：

```
/api/v1/orders  # 版本 1
/api/v2/orders  # 版本 2（未來）
```

## 測試環境

### Postman 集合
提供完整的 Postman 測試集合，包含所有端點的範例請求。

### 測試資料
測試環境提供以下測試資料：
- 測試產品編號：TEST-001, TEST-002
- 測試管理員密碼：請聯繫系統管理員

## 支援與聯繫

如有 API 相關問題：
1. 檢查本文件的錯誤處理章節
2. 查看系統日誌取得詳細錯誤資訊
3. 聯繫技術支援：api-support@dayuan.com

---

**API 文件版本**: 1.0.0  
**最後更新**: 2024年5月30日  
**相容 API 版本**: v1.0.0