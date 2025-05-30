#!/bin/bash

# 達遠訂單管理系統文件打包腳本
# 建立日期：2024-05-30

echo "開始打包達遠訂單管理系統文件..."

# 建立打包目錄
PACKAGE_DIR="dayuan-docs-$(date +%Y%m%d)"
mkdir -p "$PACKAGE_DIR"

echo "正在複製文件..."

# 複製主要文件
cp README.md "$PACKAGE_DIR/"
cp CHANGELOG.md "$PACKAGE_DIR/"
cp LICENSE "$PACKAGE_DIR/" 2>/dev/null || echo "LICENSE 檔案不存在，跳過"

# 複製文件目錄
cp -r docs "$PACKAGE_DIR/"

# 複製重要的配置文件
cp package.json "$PACKAGE_DIR/"
cp .env.example "$PACKAGE_DIR/"
cp drizzle.config.ts "$PACKAGE_DIR/"
cp tailwind.config.ts "$PACKAGE_DIR/"
cp vite.config.ts "$PACKAGE_DIR/"

# 建立文件索引
cat > "$PACKAGE_DIR/文件索引.md" << EOF
# 達遠訂單管理系統文件包

## 主要文件
- \`README.md\` - 專案總覽和快速開始
- \`CHANGELOG.md\` - 版本更新記錄
- \`package.json\` - 專案依賴和腳本
- \`.env.example\` - 環境變數範例

## 文件目錄 (docs/)
- \`architecture/overview.md\` - 系統架構設計
- \`api/README.md\` - API 文件
- \`guides/maintenance.md\` - 維護指南
- \`guides/user-manual.md\` - 使用者手冊
- \`deployment/production-guide.md\` - 部署指南

## 配置文件
- \`drizzle.config.ts\` - 資料庫配置
- \`tailwind.config.ts\` - 樣式配置
- \`vite.config.ts\` - 建置配置

---
打包時間：$(date)
系統版本：2.0.0
EOF

# 建立壓縮檔
if command -v zip &> /dev/null; then
    zip -r "${PACKAGE_DIR}.zip" "$PACKAGE_DIR"
    echo "文件已打包至：${PACKAGE_DIR}.zip"
elif command -v tar &> /dev/null; then
    tar -czf "${PACKAGE_DIR}.tar.gz" "$PACKAGE_DIR"
    echo "文件已打包至：${PACKAGE_DIR}.tar.gz"
else
    echo "文件已準備在目錄：$PACKAGE_DIR"
fi

# 清理暫存目錄
rm -rf "$PACKAGE_DIR"

echo "文件打包完成！"