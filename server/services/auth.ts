import { createHash } from 'crypto';

export class AuthService {
  private adminPassword: string;
  // 添加一個靜態變量，用於存儲當前會話中的密碼
  private static sessionPassword: string = '';

  constructor() {
    // 首先檢查是否有會話密碼設置
    if (AuthService.sessionPassword) {
      console.log('使用會話中的密碼');
      this.adminPassword = AuthService.sessionPassword;
    } else {
      // 否則使用環境變量中的密碼
      console.log('從環境變量獲取密碼');
      this.adminPassword = process.env.ADMIN_PASSWORD || '';
      // 將環境變量中的密碼同步到會話密碼
      AuthService.sessionPassword = this.adminPassword;
    }
    
    if (!this.adminPassword) {
      console.warn('管理員密碼未在環境變量中設置');
    }
  }

  // 哈希密碼 (SHA-256)
  public hashPassword(password: string): string {
    return createHash('sha256').update(password).digest('hex');
  }

  // 驗證密碼
  async verifyPassword(password: string): Promise<boolean> {
    if (!this.adminPassword) {
      throw new Error('管理員密碼未配置');
    }
    
    // 支持舊系統的明文密碼以及新系統的哈希密碼
    // 檢查當前存儲的密碼是否是哈希值（假設哈希值長度為64個字符）
    if (this.adminPassword.length === 64 && /^[0-9a-f]+$/.test(this.adminPassword)) {
      // 存儲的是哈希密碼，對輸入的密碼進行哈希再比較
      const hashedPassword = this.hashPassword(password);
      return hashedPassword === this.adminPassword;
    } else {
      // 存儲的是明文密碼，直接比較
      return password === this.adminPassword;
    }
  }
  
  // 更新會話中的密碼 (無需重啟伺服器)
  public static updateSessionPassword(newHashedPassword: string): void {
    console.log('更新會話密碼');
    AuthService.sessionPassword = newHashedPassword;
  }
}
