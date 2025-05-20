import { createHash } from 'crypto';

export class AuthService {
  private adminPassword: string;
  private static instance: AuthService | null = null;
  // 使用靜態變量儲存密碼，確保整個應用使用相同的密碼
  private static currentPassword: string = '';
  // 此標記表示密碼已從數據庫完成載入
  private static passwordInitialized: boolean = false;

  constructor() {
    if (AuthService.instance) {
      // 如果已經有實例，直接返回該實例的密碼
      this.adminPassword = AuthService.currentPassword;
      return;
    }
    
    // 首次初始化時從環境變量讀取密碼(臨時)
    this.adminPassword = process.env.ADMIN_PASSWORD || '';
    
    // 存儲密碼到靜態變量
    AuthService.currentPassword = this.adminPassword;
    
    // 設置單例實例
    AuthService.instance = this;
    
    console.log('已初始化管理員密碼服務');
    
    if (!this.adminPassword) {
      console.warn('警告: 管理員密碼未設置');
    }
  }
  
  // 從數據庫初始化密碼 - 增強版本
  public async initializePasswordFromDatabase(password: string | null): Promise<void> {
    // 首先檢查是否已有備份環境變量密碼
    const backupPassword = process.env.ADMIN_PASSWORD_BACKUP;
    const updatedTime = process.env.ADMIN_PASSWORD_UPDATED_AT;
    
    if (backupPassword && updatedTime) {
      console.log(`發現環境變量備份密碼，更新時間: ${updatedTime}`);
      
      // 如果數據庫密碼為空或與備份不同，優先使用備份
      if (!password || password !== backupPassword) {
        console.log('使用環境變量備份密碼 (可能比數據庫更新)');
        AuthService.currentPassword = backupPassword;
        this.adminPassword = backupPassword;
        AuthService.passwordInitialized = true;
        return; // 使用備份密碼，提前返回
      }
    }
    
    // 檢查是否已初始化過 (避免重複)
    if (AuthService.passwordInitialized) {
      console.log('密碼已初始化，跳過重複操作');
      return;
    }
    
    // 從數據庫載入密碼
    if (password) {
      console.log('從數據庫載入密碼');
      
      // 分析密碼值是否包含時間戳標記
      let finalPassword = password;
      if (password.includes('_')) {
        // 提取實際密碼部分 (不含時間戳)
        finalPassword = password.split('_')[0];
        console.log('從複合密碼中提取了實際密碼部分');
      }
      
      // 更新靜態密碼和實例密碼
      AuthService.currentPassword = finalPassword;
      this.adminPassword = finalPassword;
      
      // 同步到環境變量
      process.env.ADMIN_PASSWORD = finalPassword;
      process.env.ADMIN_PASSWORD_BACKUP = finalPassword;
      
      // 標記密碼已初始化
      AuthService.passwordInitialized = true;
      console.log('密碼已成功從數據庫初始化');
    } else {
      // 數據庫中沒有密碼，使用環境變量
      console.log('數據庫中無密碼，轉而使用環境變量密碼');
      const envPassword = process.env.ADMIN_PASSWORD || '';
      
      if (envPassword) {
        // 確保靜態變量和實例變量保持同步
        AuthService.currentPassword = envPassword;
        this.adminPassword = envPassword;
        AuthService.passwordInitialized = true;
        console.log('成功從環境變量初始化密碼');
      } else {
        console.warn('警告: 未找到任何可用的管理員密碼');
      }
    }
  }

  // 哈希密碼 (SHA-256)
  public hashPassword(password: string): string {
    return createHash('sha256').update(password).digest('hex');
  }

  // 改進的密碼驗證方法 - 增加了錯誤處理和性能優化
  async verifyPassword(password: string): Promise<boolean> {
    try {
      // 始終從靜態變量獲取最新密碼
      const currentAdminPassword = AuthService.currentPassword;
      
      if (!currentAdminPassword) {
        throw new Error('管理員密碼未配置');
      }
      
      // 支持舊系統的明文密碼以及新系統的哈希密碼
      if (currentAdminPassword.length === 64 && /^[0-9a-f]+$/.test(currentAdminPassword)) {
        // 哈希模式 - 使用時間安全比較以防止計時攻擊
        const hashedPassword = this.hashPassword(password);
        
        // 使用固定時間比較，防止計時攻擊
        let result = true;
        const a = Buffer.from(hashedPassword);
        const b = Buffer.from(currentAdminPassword);
        
        if (a.length !== b.length) {
          result = false;
        }
        
        // 固定時間比較，無論成功或失敗都執行相同次數操作
        let diff = 0;
        for (let i = 0; i < Math.min(a.length, b.length); i++) {
          diff |= (a[i] ^ b[i]);
        }
        
        return result && diff === 0;
      } else {
        // 明文模式 - 注意：這僅作為過渡，應盡快升級到哈希模式
        return password === currentAdminPassword;
      }
    } catch (error) {
      console.error('密碼驗證過程中發生錯誤:', error);
      return false; // 安全起見，錯誤時拒絕驗證
    }
  }
  
  // 更新密碼 (增強版) - 全面更新所有地方的密碼
  public updatePassword(newHashedPassword: string): void {
    console.log('正在全面更新管理員密碼');
    
    // 處理可能包含時間戳的密碼格式
    let finalPassword = newHashedPassword;
    if (newHashedPassword.includes('_')) {
      finalPassword = newHashedPassword.split('_')[0]; 
      console.log('從複合密碼中提取了實際哈希部分');
    }
    
    // 1. 更新靜態密碼變量 (所有實例共享)
    AuthService.currentPassword = finalPassword;
    console.log('已更新靜態密碼變量');
    
    // 2. 更新當前實例的密碼 (單例模式)
    this.adminPassword = finalPassword;
    console.log('已更新實例密碼變量');
    
    // 3. 更新環境變量 (確保在重啟後仍可用)
    process.env.ADMIN_PASSWORD = finalPassword;
    console.log('已更新主要環境變量');
    
    // 4. 更新備份環境變量 (多重冗餘)
    process.env.ADMIN_PASSWORD_BACKUP = finalPassword;
    process.env.ADMIN_PASSWORD_UPDATED_AT = new Date().toISOString();
    console.log('已更新備份環境變量及時間戳');
    
    // 5. 設置初始化標記 (避免重複初始化)
    AuthService.passwordInitialized = true;
    
    console.log('管理員密碼已全面更新完成');
  }
  
  // 獲取當前密碼
  public getCurrentPassword(): string {
    return AuthService.currentPassword;
  }
}
