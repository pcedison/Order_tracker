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
  
  // 從數據庫初始化密碼
  public async initializePasswordFromDatabase(password: string | null): Promise<void> {
    if (AuthService.passwordInitialized) {
      console.log('密碼已從數據庫初始化，跳過');
      return;
    }
    
    if (password) {
      console.log('從數據庫載入密碼');
      
      // 更新靜態密碼和實例密碼
      AuthService.currentPassword = password;
      this.adminPassword = password;
      
      // 標記密碼已初始化
      AuthService.passwordInitialized = true;
    } else {
      console.log('數據庫中無密碼，使用環境變量中的密碼');
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
  
  // 更新密碼 (更新靜態變量和環境變量)
  public updatePassword(newHashedPassword: string): void {
    console.log('正在更新管理員密碼');
    
    // 更新靜態密碼變量
    AuthService.currentPassword = newHashedPassword;
    
    // 更新當前實例的密碼
    this.adminPassword = newHashedPassword;
    
    // 更新環境變量 (記憶體)
    process.env.ADMIN_PASSWORD = newHashedPassword;
    
    console.log('管理員密碼已更新');
  }
  
  // 獲取當前密碼
  public getCurrentPassword(): string {
    return AuthService.currentPassword;
  }
}
