/**
 * 數據庫初始化和啟動腳本
 * 
 * 使用方法:
 * 1. 確保已設置環境變數，包括 DATABASE_URL
 * 2. 執行 `node scripts/db-setup.js`
 * 
 * 這個腳本會:
 * 1. 檢查數據庫連接
 * 2. 驗證必要的表結構
 * 3. 初始化基本配置
 */

// 引入必要的庫
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const crypto = require('crypto');
require('dotenv').config();

// 檢查必要的環境變數
const checkEnvVars = () => {
  const requiredVars = [
    'DATABASE_URL',
    'SUPABASE_URL',
    'SUPABASE_KEY',
    'SUPABASE_SERVICE_KEY',
    'SPREADSHEET_API_KEY',
    'SPREADSHEET_ID'
  ];
  
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error('❌ 缺少必要的環境變數:');
    missing.forEach(varName => console.error(`   - ${varName}`));
    console.error('請在 .env 文件中設置這些變數');
    return false;
  }
  
  return true;
};

// 建立數據庫連接
const connectToDatabase = async () => {
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    
    // 測試連接
    await pool.query('SELECT NOW()');
    console.log('✅ 數據庫連接成功');
    return pool;
  } catch (error) {
    console.error('❌ 數據庫連接失敗:', error.message);
    console.error('請檢查 DATABASE_URL 環境變數是否正確');
    return null;
  }
};

// 檢查並創建必要的表結構
const setupTables = async (pool) => {
  try {
    // 檢查是否存在 configs 表
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'configs'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('正在創建 configs 表...');
      await pool.query(`
        CREATE TABLE configs (
          key TEXT PRIMARY KEY,
          value TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
    }
    
    // 檢查是否存在 session 表
    const sessionTableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'session'
      );
    `);
    
    if (!sessionTableCheck.rows[0].exists) {
      console.log('正在創建 session 表...');
      await pool.query(`
        CREATE TABLE session (
          sid TEXT PRIMARY KEY,
          sess JSON NOT NULL,
          expire TIMESTAMP(6) NOT NULL
        );
        CREATE INDEX "IDX_session_expire" ON session ("expire");
      `);
    }
    
    // 檢查是否存在訂單相關表
    const ordersTableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'orders'
      );
    `);
    
    if (!ordersTableCheck.rows[0].exists) {
      console.log('提示: 缺少訂單表，請使用 npm run db:push 創建所有表結構');
    } else {
      console.log('✅ 訂單表已存在');
    }
    
    return true;
  } catch (error) {
    console.error('❌ 設置表結構失敗:', error.message);
    return false;
  }
};

// 初始化配置
const initializeConfigs = async (pool) => {
  try {
    // 檢查是否已存在配置
    const configsCheck = await pool.query('SELECT COUNT(*) FROM configs');
    
    // 如果已有配置，不再重複初始化
    if (parseInt(configsCheck.rows[0].count) > 0) {
      console.log('✅ 配置已存在，跳過初始化');
      return true;
    }
    
    // 保存環境變數到配置表
    const configsToSave = [
      { key: 'SUPABASE_URL', value: process.env.SUPABASE_URL },
      { key: 'SUPABASE_KEY', value: process.env.SUPABASE_KEY },
      { key: 'SUPABASE_SERVICE_KEY', value: process.env.SUPABASE_SERVICE_KEY },
      { key: 'SPREADSHEET_API_KEY', value: process.env.SPREADSHEET_API_KEY },
      { key: 'SPREADSHEET_ID', value: process.env.SPREADSHEET_ID }
    ];
    
    // 如果存在管理員密碼，創建哈希並存儲
    if (process.env.ADMIN_PASSWORD) {
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = crypto.createHash('sha256')
        .update(process.env.ADMIN_PASSWORD + salt)
        .digest('hex');
      
      configsToSave.push({ 
        key: 'ADMIN_PASSWORD_HASH', 
        value: `${hash}.${salt}` 
      });
    }
    
    // 批量插入配置
    for (const config of configsToSave) {
      await pool.query(
        'INSERT INTO configs (key, value) VALUES ($1, $2)',
        [config.key, config.value]
      );
    }
    
    console.log('✅ 配置初始化完成');
    return true;
  } catch (error) {
    console.error('❌ 初始化配置失敗:', error.message);
    return false;
  }
};

// 主函數
const main = async () => {
  console.log('-----------------------------------');
  console.log('🚀 訂單管理系統數據庫設置工具');
  console.log('-----------------------------------\n');
  
  // 檢查環境變數
  if (!checkEnvVars()) {
    return;
  }
  
  // 連接數據庫
  const pool = await connectToDatabase();
  if (!pool) {
    return;
  }
  
  // 設置表結構
  if (!await setupTables(pool)) {
    return;
  }
  
  // 初始化配置
  if (!await initializeConfigs(pool)) {
    return;
  }
  
  console.log('\n✨ 數據庫設置完成!\n');
  console.log('您現在可以執行 npm run dev 啟動應用程序');
  console.log('-----------------------------------');
  
  // 關閉數據庫連接
  await pool.end();
};

// 執行主函數
main().catch(error => {
  console.error('設置過程中發生錯誤:', error);
  process.exit(1);
});