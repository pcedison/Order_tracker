import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import { z } from "zod";
import { SpreadsheetService } from "./services/spreadsheet";
import { AuthService } from "./services/auth";
import MemoryStore from "memorystore";
import pgSession from 'connect-pg-simple';
import { pool } from "./db";

// 扩展 session 类型，添加 isAdmin 属性
declare module "express-session" {
  interface SessionData {
    isAdmin: boolean;
  }
}

// 创建PostgreSQL会话存储
const PostgresStore = pgSession(session);

export async function registerRoutes(app: Express): Promise<Server> {
  // 确保session表存在
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
      );
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
    `);
    console.log("Session table verified/created");
  } catch (err) {
    console.error("Failed to create session table:", err);
  }

  // Setup session middleware
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "supersecretkey",
      resave: false,
      saveUninitialized: false,
      store: new PostgresStore({
        pool: pool,
        tableName: 'session',
        createTableIfMissing: true,
      }),
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      },
    })
  );

  // Initialize services
  const spreadsheetService = new SpreadsheetService();
  const authService = new AuthService();

  // Auth API routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({ success: false, message: "Password is required" });
      }

      const success = await authService.verifyPassword(password);

      if (success) {
        // Set admin session
        if (req.session) {
          req.session.isAdmin = true;
        }
        return res.json({ success: true });
      } else {
        return res.status(401).json({ success: false, message: "Incorrect password" });
      }
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ success: false, message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ success: false, message: "Logout failed" });
        }
        res.clearCookie("connect.sid");
        return res.json({ success: true });
      });
    } else {
      return res.json({ success: true });
    }
  });

  app.get("/api/auth/status", (req, res) => {
    const isAuthenticated = req.session?.isAdmin === true;
    return res.json({ authenticated: isAuthenticated });
  });

  // Products API routes
  app.get("/api/products", async (req, res) => {
    try {
      const products = await spreadsheetService.getProducts();
      return res.json(products);
    } catch (error) {
      console.error("Get products error:", error);
      return res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  // Orders API routes
  
  // 1. 特殊路由应该放在前面，避免被参数路由拦截
  app.get("/api/orders/history", async (req, res) => {
    try {
      // Check if user is admin
      if (!req.session?.isAdmin) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start date and end date are required" });
      }
      
      const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
      const validStartDate = dateSchema.safeParse(startDate);
      const validEndDate = dateSchema.safeParse(endDate);
      
      if (!validStartDate.success || !validEndDate.success) {
        return res.status(400).json({ message: "Invalid date format" });
      }

      const orders = await storage.getOrdersByDateRange(
        startDate as string,
        endDate as string,
        "completed"
      );
      
      return res.json(orders);
    } catch (error) {
      console.error("Get history error:", error);
      return res.status(500).json({ message: "Failed to fetch history orders" });
    }
  });

  app.get("/api/orders/stats", async (req, res) => {
    try {
      // Check if user is admin
      if (!req.session?.isAdmin) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { year, month } = req.query;
      
      if (!year) {
        return res.status(400).json({ message: "Year is required" });
      }
      
      const yearSchema = z.string().regex(/^\d{4}$/);
      const validYear = yearSchema.safeParse(year);
      
      if (!validYear.success) {
        return res.status(400).json({ message: "Invalid year format" });
      }

      const monthSchema = z.string().regex(/^\d{1,2}$/).optional();
      const validMonth = monthSchema.safeParse(month);
      
      if (month && !validMonth.success) {
        return res.status(400).json({ message: "Invalid month format" });
      }

      const stats = await storage.generateOrderStats(year as string, month as string | undefined);
      return res.json(stats);
    } catch (error) {
      console.error("Get stats error:", error);
      return res.status(500).json({ message: "Failed to generate statistics" });
    }
  });
  
  // 2. 然后是基本路由
  app.get("/api/orders", async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      
      const statusSchema = z.enum(["temporary", "completed"]).optional();
      const validStatus = statusSchema.safeParse(status);
      
      if (status && !validStatus.success) {
        return res.status(400).json({ message: "Invalid status parameter" });
      }
      
      const orders = await storage.getOrders(status as "temporary" | "completed" | undefined);
      return res.json(orders);
    } catch (error) {
      console.error("Get orders error:", error);
      return res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.post("/api/orders", async (req, res) => {
    try {
      const orderData = req.body;
      const order = await storage.createOrder(orderData);
      return res.status(201).json(order);
    } catch (error) {
      console.error("Create order error:", error);
      return res.status(500).json({ message: "Failed to create order" });
    }
  });
  
  // 3. 最后是参数路由
  app.delete("/api/orders/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteOrder(id);
      return res.json({ success: true });
    } catch (error) {
      console.error("Delete order error:", error);
      return res.status(500).json({ message: "Failed to delete order" });
    }
  });
  
  // 更新暂存订单（编辑数量和/或日期）
  app.patch("/api/orders/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { quantity, delivery_date } = req.body;
      
      if (!quantity) {
        return res.status(400).json({ message: "Quantity is required" });
      }
      
      // 验证数量是否为正数
      const quantitySchema = z.number().positive();
      const validQuantity = quantitySchema.safeParse(quantity);
      
      if (!validQuantity.success) {
        return res.status(400).json({ message: "Quantity must be a positive number" });
      }
      
      // 如果提供了日期，验证日期格式是否正确
      if (delivery_date) {
        const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
        const validDate = dateSchema.safeParse(delivery_date);
        
        if (!validDate.success) {
          return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD" });
        }
      }
      
      await storage.updateTemporaryOrder(id, quantity, delivery_date);
      return res.json({ success: true });
    } catch (error) {
      console.error("Update order error:", error);
      return res.status(500).json({ message: "Failed to update order" });
    }
  });

  app.patch("/api/orders/:id/complete", async (req, res) => {
    try {
      // Check if user is admin
      if (!req.session?.isAdmin) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { id } = req.params;
      const order = await storage.completeOrder(id);
      return res.json(order);
    } catch (error) {
      console.error("Complete order error:", error);
      return res.status(500).json({ message: "Failed to complete order" });
    }
  });
  
  // 编辑历史订单（完成的订单）
  app.patch("/api/orders/history/:id", async (req, res) => {
    try {
      // Check if user is admin
      if (!req.session?.isAdmin) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { id } = req.params;
      const { product_code, quantity } = req.body;
      
      if (!product_code || !quantity) {
        return res.status(400).json({ message: "Product code and quantity are required" });
      }
      
      // Validate quantity
      const quantitySchema = z.number().positive();
      const validQuantity = quantitySchema.safeParse(quantity);
      
      if (!validQuantity.success) {
        return res.status(400).json({ message: "Quantity must be a positive number" });
      }
      
      await storage.editHistoryOrder(id, product_code, quantity);
      return res.json({ success: true });
    } catch (error) {
      console.error("Edit history order error:", error);
      return res.status(500).json({ message: "Failed to update history order" });
    }
  });
  
  // 删除历史订单（完成的订单）
  app.delete("/api/orders/history/:id", async (req, res) => {
    try {
      // Check if user is admin
      if (!req.session?.isAdmin) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { id } = req.params;
      const { product_code } = req.body;
      
      if (!product_code) {
        return res.status(400).json({ message: "Product code is required" });
      }
      
      await storage.deleteHistoryOrder(id, product_code);
      return res.json({ success: true });
    } catch (error) {
      console.error("Delete history order error:", error);
      return res.status(500).json({ message: "Failed to delete history order" });
    }
  });
  
  // 配置相关 API
  // 获取所有配置信息 - 允许非管理员访问，但仅返回公共配置
  app.get("/api/configs", async (req, res) => {
    try {
      const isAuthenticated = req.session && req.session.isAdmin;
      const configs = await storage.getAllConfigs();
      
      // 移除敏感信息，仅返回是否配置了该项
      // 对于非管理员，只返回非敏感配置
      const safeConfigs = Object.keys(configs).reduce((result, key) => {
        // 对于密码和密钥，对管理员显示掩码，对非管理员不显示
        if (key.toLowerCase().includes('password') || 
            key.toLowerCase().includes('key') || 
            key.toLowerCase().includes('secret')) {
          if (isAuthenticated) {
            result[key] = configs[key] ? '******' : null;
          }
        } else {
          // 非敏感配置对所有用户可见
          result[key] = configs[key];
        }
        return result;
      }, {} as Record<string, string | null>);
      
      return res.json(safeConfigs);
    } catch (error) {
      console.error("Error getting configs:", error);
      return res.status(500).json({ message: "Failed to get configurations" });
    }
  });
  
  // 更新配置信息
  app.post("/api/configs", async (req, res) => {
    try {
      const isAuthenticated = req.session && req.session.isAdmin;
      if (!isAuthenticated) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const { key, value } = req.body;
      
      if (!key || value === undefined) {
        return res.status(400).json({ message: "Key and value are required" });
      }
      
      await storage.setConfig(key, value);
      
      // 对于环境变量，也实时更新（这通常只在开发环境中有效）
      if (key === 'SUPABASE_URL' || key === 'SUPABASE_KEY' || 
          key === 'SPREADSHEET_API_KEY' || key === 'SPREADSHEET_ID') {
        process.env[key] = value;
      }
      
      return res.json({ success: true });
    } catch (error) {
      console.error("Error updating config:", error);
      return res.status(500).json({ message: "Failed to update configuration" });
    }
  });
  
  // 更新管理员密码
  app.post("/api/admin/password", async (req, res) => {
    try {
      const isAuthenticated = req.session && req.session.isAdmin;
      if (!isAuthenticated) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }
      
      const success = await storage.updateAdminPassword(currentPassword, newPassword);
      
      if (!success) {
        return res.status(400).json({ message: "Invalid current password" });
      }
      
      return res.json({ success: true });
    } catch (error) {
      console.error("Error updating admin password:", error);
      return res.status(500).json({ message: "Failed to update admin password" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
