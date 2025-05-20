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

  // 驗證密碼
  async verifyPassword(password: string): Promise<boolean> {
    // 始終從靜態變量獲取最新密碼
    const currentAdminPassword = AuthService.currentPassword;
    
    if (!currentAdminPassword) {
      throw new Error('管理員密碼未配置');
    }
    
    // 支持舊系統的明文密碼以及新系統的哈希密碼
    if (currentAdminPassword.length === 64 && /^[0-9a-f]+$/.test(currentAdminPassword)) {
      // 哈希模式
      console.log('使用哈希模式驗證密碼');
      const hashedPassword = this.hashPassword(password);
      return hashedPassword === currentAdminPassword;
    } else {
      // 明文模式
      console.log('使用明文模式驗證密碼');
      return password === currentAdminPassword;
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
