#!/usr/bin/env node

/**
 * 數據庫初始化和遷移腳本
 * 
 * 使用方法:
 * 1. 確保已設置環境變數（DATABASE_URL 等）
 * 2. 執行 `node scripts/db-init.js`
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 顯示歡迎信息
console.log('='.repeat(50));
console.log('訂單管理系統 - 數據庫初始化工具');
console.log('='.repeat(50));

// 檢查環境變數
const requiredEnvVars = [
  'DATABASE_URL',
  'PGUSER',
  'PGHOST',
  'PGPASSWORD',
  'PGPORT',
  'PGDATABASE',
  'ADMIN_PASSWORD'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('錯誤: 缺少必要的環境變數:');
  missingVars.forEach(varName => console.error(`- ${varName}`));
  console.error('\n請確保已創建 .env 文件並設置所有必要的環境變數。');
  console.error('您可以從 .env.example 複製一個模板並填入您的配置值。');
  process.exit(1);
}

// 執行數據庫遷移
console.log('\n開始數據庫遷移...');
try {
  execSync('npm run db:push', { stdio: 'inherit' });
  console.log('數據庫遷移完成!');
} catch (error) {
  console.error('數據庫遷移失敗:', error.message);
  process.exit(1);
}

// 生成隨機會話密鑰（如果未設置）
if (!process.env.SESSION_SECRET) {
  const sessionSecret = crypto.randomBytes(32).toString('hex');
  console.log('\n警告: 未找到 SESSION_SECRET 環境變數。');
  console.log(`建議將以下行添加到您的 .env 文件中:`);
  console.log(`SESSION_SECRET=${sessionSecret}`);
}

console.log('\n數據庫初始化完成!');
console.log('您現在可以運行 npm run dev 啟動應用。');
console.log('='.repeat(50));