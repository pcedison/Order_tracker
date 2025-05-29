# 專案中負責預覽列印與 A4 排版的程式碼分析

## 1. 主要列印樣式 CSS (client/src/index.css 第258-374行)

```css
/* 列印樣式 */
@media print {
  /* 隱藏不需要列印的元素 */
  .print-hidden,
  nav,
  .navigation,
  button:not(.print-visible),
  .sidebar,
  .header,
  .footer,
  .no-print,
  .dashboard-header,
  .loading-spinner {
    display: none !important;
  }

  /* 確保包含表格的容器可以顯示 */
  .glass-morphism {
    background: transparent !important;
    box-shadow: none !important;
    border: none !important;
    border-radius: 0 !important;
  }

  /* 確保列印區域佔滿整個頁面 */
  body {
    margin: 0 !important;
    padding: 5px !important;
    font-size: 12px;
    line-height: 1.2;
    color: #000;
    background: white !important;
  }

  /* 隱藏統計卡片區域 */
  .stats-cards {
    display: none !important;
  }

  /* 產品統計表格列印樣式 */
  .product-stats-table {
    width: 100% !important;
    border-collapse: collapse !important;
    margin: 0 !important;
  }

  .product-stats-table th,
  .product-stats-table td {
    border: 1px solid #ddd !important;
    padding: 4px 6px !important;
    text-align: left !important;
    font-size: 10px !important;
    color: #000 !important;
    background: white !important;
    line-height: 1.1 !important;
  }

  .product-stats-table th {
    background: #f5f5f5 !important;
    font-weight: bold !important;
  }

  .product-stats-table tr:nth-child(even) {
    background: #f9f9f9 !important;
  }

  /* 標題樣式 */
  .print-title {
    font-size: 16px !important;
    font-weight: bold !important;
    margin: 0 0 8px 0 !important;
    text-align: center !important;
    color: #000 !important;
    page-break-after: avoid;
    display: block !important;
  }

  /* 移除所有陰影和漸變效果 */
  * {
    box-shadow: none !important;
    background-image: none !important;
    text-shadow: none !important;
  }

  /* 防止產生空白頁面的關鍵設置 */
  @page {
    margin: 0.5in;
    size: A4;
  }

  /* 強制所有內容在一頁內 - 可能的問題區域 */
  * {
    page-break-after: avoid !important;
    page-break-before: avoid !important;
    orphans: 1000 !important;
    widows: 1000 !important;
  }

  /* 確保根容器不分頁 */
  body {
    page-break-after: never !important;
  }

  /* 表格不分頁 */
  .product-stats-table {
    page-break-inside: avoid !important;
    page-break-after: never !important;
  }

  /* 移除底部空間 */
  .stats-container,
  .stats-container *,
  .glass-morphism {
    margin-bottom: 0 !important;
    padding-bottom: 0 !important;
  }
}
```

## 2. React 組件結構 (client/src/components/DashboardStats.tsx 第170-240行)

```jsx
{/* 產品統計表 */}
{statsData?.stats && statsData.stats.length > 0 && (
  <div className="glass-morphism rounded-2xl shadow-2xl overflow-hidden">
    <div className="gradient-primary p-6 text-white print-hidden">
      <h3 className="text-xl font-bold">產品統計 - {statsData.periodText}</h3>
    </div>
    <h3 className="print-title hidden print:block text-center text-lg font-bold mb-4">
      產品統計 - {statsData.periodText}
    </h3>
    <div className="overflow-x-auto">
      <table className="product-stats-table w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">產品編號</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">產品名稱</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">訂單次數</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">總數量</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">單價</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">總價</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {statsData.stats.map((item, index) => (
            <tr key={index} className="table-row-hover">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {item.code}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                {item.name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                {item.orderCount} 次
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                {item.totalQuantity} 公斤
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                ${item.unitPrice || 0}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                ${item.totalPrice?.toLocaleString() || '0'}
              </td>
            </tr>
          ))}
          {/* 總計行 */}
          <tr className="bg-gray-100 border-t-2 border-gray-300">
            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900" colSpan={2}>
              總計
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
              {statsData.totalOrders} 次
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
              {statsData.totalKilograms} 公斤 ({Math.ceil(statsData.totalKilograms / 25)} 包)
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
              -
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
              ${statsData.totalAmount?.toLocaleString() || '0'}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
)}

{/* 已完成訂單（按日期分組） */}
{Object.keys(groupedOrders).length > 0 && (
  <div className="glass-morphism rounded-2xl shadow-2xl overflow-hidden print-hidden">
    <div className="gradient-success p-6 text-white">
      <h3 className="text-xl font-bold">已完成訂單</h3>
    </div>
    {/* ... 其他內容 ... */
  </div>
)}
```

## 3. 可能導致第二頁空白的問題區域分析

### 問題1: CSS 衝突
- 第349-354行：通用選擇器 `*` 過於廣泛，可能影響瀏覽器的分頁計算
- 第357-359行：`body` 設定了 `page-break-after: never` 但同時在第283-290行又有其他樣式

### 問題2: 容器結構
- `.glass-morphism` 容器可能在列印時仍然佔用空間
- `.overflow-x-auto` 容器可能影響頁面高度計算

### 問題3: Tailwind CSS 類別衝突
- React 組件中使用了大量 Tailwind 類別（如 `px-6 py-4`）
- 這些類別在列印時可能與自定義 CSS 產生衝突

### 問題4: 表格內容長度
- 動態生成的表格內容可能超出單頁容量
- 總計行的存在可能推移內容到下一頁

## 4. 建議的修復方向

1. **簡化 CSS 選擇器**：避免使用通用選擇器 `*`
2. **檢查容器高度**：確保 `.glass-morphism` 在列印時完全透明且無高度
3. **移除 Tailwind 衝突**：在列印時覆蓋所有 Tailwind 間距類別
4. **動態內容控制**：根據內容長度動態調整列印樣式