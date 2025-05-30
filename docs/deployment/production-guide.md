# 生產環境部署指南

## 部署前檢查清單

### 環境準備
- [ ] 確認 Node.js 版本 >= 18.0.0
- [ ] 驗證 npm 或 yarn 套件管理器
- [ ] 準備 Supabase 專案和資料庫
- [ ] 取得 Google Sheets API 金鑰
- [ ] 設定 SSL 憑證

### 安全設定
- [ ] 生成強密碼作為 SESSION_SECRET
- [ ] 設定管理員初始密碼
- [ ] 檢查資料庫存取權限
- [ ] 確認 API 金鑰安全性

### 效能優化
- [ ] 啟用生產模式建置
- [ ] 配置 CDN 分發靜態資源
- [ ] 設定適當的快取策略
- [ ] 優化資料庫查詢

## Replit 部署（推薦）

### 1. 專案設定
```bash
# 1. 在 Replit 建立新專案
# 2. 匯入 GitHub 儲存庫或上傳程式碼
# 3. Replit 會自動偵測 Node.js 專案
```

### 2. 環境變數設定
在 Replit 專案的「Secrets」中設定以下變數：

```env
# 必要環境變數
DATABASE_URL=postgresql://postgres:[password]@db.[supabase-ref].supabase.co:5432/postgres
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...

# Google Sheets 設定
GOOGLE_SHEETS_API_KEY=AIzaSyD...
GOOGLE_SHEETS_ID=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms

# 安全設定
SESSION_SECRET=your-super-secret-session-key-min-32-chars
NODE_ENV=production

# 可選設定
PORT=5000
ADMIN_EMAIL=pcedison@gmail.com
```

### 3. 資料庫設定
```bash
# 在 Replit Shell 中執行
npm run db:push
npm run db:seed
```

### 4. 部署執行
```bash
# 啟動應用程式
npm run dev

# 或使用 Replit 內建的 Run 按鈕
```

### 5. 自動部署設定
Replit 支援自動部署，可在專案設定中啟用：
1. 連結到 GitHub 儲存庫
2. 啟用「Auto-deploy from GitHub」
3. 選擇部署分支（通常是 main）

## 手動部署

### 1. 伺服器準備
```bash
# Ubuntu/Debian 系統
sudo apt update
sudo apt install nodejs npm nginx postgresql-client

# 檢查版本
node --version  # 應該 >= 18.0.0
npm --version   # 應該 >= 9.0.0
```

### 2. 應用程式部署
```bash
# 1. 複製程式碼
git clone <repository-url>
cd dayuan-order-system

# 2. 安裝依賴
npm ci --production

# 3. 建置應用程式
npm run build

# 4. 設定環境變數
cp .env.example .env
# 編輯 .env 檔案

# 5. 初始化資料庫
npm run db:push

# 6. 啟動應用程式
npm start
```

### 3. PM2 處理程序管理
```bash
# 安裝 PM2
npm install -g pm2

# 建立 PM2 配置檔
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'dayuan-order-system',
    script: 'server/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF

# 啟動應用程式
pm2 start ecosystem.config.js

# 設定開機自動啟動
pm2 startup
pm2 save
```

### 4. Nginx 反向代理設定
```nginx
# /etc/nginx/sites-available/dayuan-order-system
server {
    listen 80;
    server_name your-domain.com;
    
    # 重導向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL 憑證設定
    ssl_certificate /path/to/ssl/certificate.crt;
    ssl_certificate_key /path/to/ssl/private.key;
    
    # SSL 安全設定
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    # 安全標頭
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";
    
    # 應用程式代理
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 超時設定
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # 靜態資源快取
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # 壓縮設定
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
}
```

```bash
# 啟用站點
sudo ln -s /etc/nginx/sites-available/dayuan-order-system /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Docker 部署

### 1. Dockerfile
```dockerfile
# 多階段建置
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY . .
RUN npm run build

# 生產階段
FROM node:18-alpine AS production

# 建立非 root 使用者
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

WORKDIR /app

# 複製建置結果
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package*.json ./

# 建立日誌目錄
RUN mkdir -p logs && chown nextjs:nodejs logs

USER nextjs

EXPOSE 5000

# 健康檢查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

CMD ["npm", "start"]
```

### 2. Docker Compose
```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - GOOGLE_SHEETS_API_KEY=${GOOGLE_SHEETS_API_KEY}
      - GOOGLE_SHEETS_ID=${GOOGLE_SHEETS_ID}
      - SESSION_SECRET=${SESSION_SECRET}
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
    networks:
      - app-network
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped
    networks:
      - app-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/ssl/certs:ro
    restart: unless-stopped
    networks:
      - app-network
    depends_on:
      - app

volumes:
  redis_data:

networks:
  app-network:
    driver: bridge
```

### 3. 部署指令
```bash
# 建置和啟動
docker-compose up -d

# 檢查狀態
docker-compose ps

# 查看日誌
docker-compose logs -f app

# 更新部署
docker-compose pull
docker-compose up -d
```

## 雲端平台部署

### AWS EC2 部署
```bash
# 1. 建立 EC2 實例（Ubuntu 20.04 LTS）
# 2. 設定安全群組（開放 80, 443, 22 連接埠）
# 3. 連線到實例
ssh -i your-key.pem ubuntu@your-ec2-ip

# 4. 安裝必要軟體
sudo apt update
sudo apt install nodejs npm nginx certbot python3-certbot-nginx

# 5. 部署應用程式（參考手動部署章節）

# 6. 設定 SSL 憑證
sudo certbot --nginx -d your-domain.com
```

### Google Cloud Platform 部署
```bash
# 1. 建立 Compute Engine 實例
gcloud compute instances create dayuan-order-system \
  --image-family=ubuntu-2004-lts \
  --image-project=ubuntu-os-cloud \
  --zone=asia-east1-a \
  --tags=http-server,https-server

# 2. 設定防火牆規則
gcloud compute firewall-rules create allow-http \
  --allow tcp:80 \
  --source-ranges 0.0.0.0/0 \
  --tags http-server

gcloud compute firewall-rules create allow-https \
  --allow tcp:443 \
  --source-ranges 0.0.0.0/0 \
  --tags https-server

# 3. 連線並部署（參考手動部署章節）
```

## 監控與日誌

### 1. 應用程式監控
```typescript
// 健康檢查端點
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version
  });
});
```

### 2. 日誌管理
```bash
# 建立日誌目錄
mkdir -p logs

# 設定 logrotate
cat > /etc/logrotate.d/dayuan-order-system << EOF
/path/to/app/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 nodejs nodejs
    postrotate
        pm2 reload dayuan-order-system
    endscript
}
EOF
```

### 3. 監控腳本
```bash
#!/bin/bash
# scripts/health-check.sh

API_URL="https://your-domain.com/api/health"
SLACK_WEBHOOK="your-slack-webhook-url"

response=$(curl -s -o /dev/null -w "%{http_code}" $API_URL)

if [ $response -ne 200 ]; then
    message="❌ 達遠訂單系統健康檢查失敗！HTTP 狀態碼: $response"
    curl -X POST -H 'Content-type: application/json' \
         --data "{\"text\":\"$message\"}" \
         $SLACK_WEBHOOK
fi
```

## 效能調優

### 1. Node.js 優化
```bash
# 設定 Node.js 記憶體限制
export NODE_OPTIONS="--max-old-space-size=2048"

# 啟用 V8 編譯快取
export NODE_OPTIONS="--optimize-for-size --max-old-space-size=2048"
```

### 2. 資料庫優化
```sql
-- 建立必要索引
CREATE INDEX CONCURRENTLY idx_orders_delivery_date_status 
ON orders(delivery_date, status);

CREATE INDEX CONCURRENTLY idx_orders_created_at 
ON orders(created_at);

-- 更新表統計資訊
ANALYZE orders;
ANALYZE temp_orders;
```

### 3. 快取策略
```typescript
// Redis 快取實作
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// 快取產品資料
const cacheProducts = async (products: Product[]) => {
  await redis.setex('products:all', 300, JSON.stringify(products));
};

// 取得快取資料
const getCachedProducts = async (): Promise<Product[] | null> => {
  const cached = await redis.get('products:all');
  return cached ? JSON.parse(cached) : null;
};
```

## 安全設定

### 1. 防火牆設定
```bash
# UFW 防火牆設定
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw deny 5000/tcp  # 阻擋直接存取應用程式連接埠
```

### 2. 系統安全
```bash
# 自動安全更新
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades

# 失敗登入保護
sudo apt install fail2ban
sudo systemctl enable fail2ban
```

### 3. 應用程式安全
```typescript
// 安全中間件
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  }
}));

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分鐘
  max: 100 // 限制每個 IP 100 次請求
});

app.use('/api/', limiter);
```

## 備份策略

### 1. 自動備份腳本
```bash
#!/bin/bash
# scripts/backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/dayuan-order-system"

# 建立備份目錄
mkdir -p $BACKUP_DIR

# 備份程式碼
git archive --format=zip --output="$BACKUP_DIR/code_$DATE.zip" HEAD

# 備份環境設定（去除敏感資訊）
cp .env "$BACKUP_DIR/env_$DATE.bak"

# 備份 Supabase 資料庫（如果有本地備份需求）
# supabase db dump --file "$BACKUP_DIR/database_$DATE.sql"

# 保留最近 30 天的備份
find $BACKUP_DIR -type f -mtime +30 -delete

echo "備份完成: $DATE"
```

### 2. 定期備份設定
```bash
# 新增到 crontab
crontab -e

# 每日凌晨 2 點執行備份
0 2 * * * /path/to/scripts/backup.sh >> /var/log/backup.log 2>&1
```

## 故障排除

### 1. 常見部署問題

**問題**: npm install 失敗
```bash
# 解決方案
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

**問題**: 連接埠被占用
```bash
# 檢查連接埠使用狀況
lsof -i :5000

# 結束占用程序
kill -9 <PID>
```

**問題**: 資料庫連線失敗
```bash
# 檢查資料庫連線
psql $DATABASE_URL -c "SELECT 1;"

# 檢查環境變數
echo $DATABASE_URL
```

### 2. 效能問題診斷
```bash
# 檢查系統資源
htop
iostat -x 1
free -h

# 檢查應用程式記憶體使用
pm2 monit

# 檢查資料庫效能
# 登入 Supabase 控制台查看慢查詢
```

---

**部署指南版本**: 1.0.0  
**最後更新**: 2024年5月30日  
**適用環境**: 生產環境  
**下次檢查**: 2024年8月30日