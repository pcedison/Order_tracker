import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// 增強數據庫連接池配置
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // 增加最大連接數
  idleTimeoutMillis: 30000, // 空閒連接超時時間
  connectionTimeoutMillis: 5000, // 連接超時時間
  maxUses: 7500, // 每個連接被重用的最大次數
});

// 健康檢查 - 確保數據庫連接正常
pool.on('error', (err) => {
  console.error('數據庫池發生意外錯誤', err);
});

// 創建一個Promise來驗證數據庫連接
export const dbConnTest = (async () => {
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      console.log('數據庫連接正常');
      return true;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('數據庫連接測試失敗:', err);
    return false;
  }
})();

// 初始化 Drizzle ORM 實例
export const db = drizzle({ client: pool, schema });
