import { createHash, randomBytes, pbkdf2Sync, timingSafeEqual } from 'crypto';

export interface PasswordData {
  hash: string;
  salt: string;
  iterations: number;
}

export class SecureAuthService {
  private static instance: SecureAuthService | null = null;
  private currentPasswordData: PasswordData | null = null;
  private isInitialized: boolean = false;

  constructor() {
    if (SecureAuthService.instance) {
      return SecureAuthService.instance;
    }
    SecureAuthService.instance = this;
  }

  /**
   * 使用 PBKDF2 安全地雜湊密碼
   */
  private hashPasswordSecure(password: string, salt?: Buffer): PasswordData {
    const saltBuffer = salt || randomBytes(32);
    const iterations = 100000; // 100,000 次迭代
    const hashBuffer = pbkdf2Sync(password, saltBuffer, iterations, 64, 'sha512');
    
    return {
      hash: hashBuffer.toString('hex'),
      salt: saltBuffer.toString('hex'),
      iterations
    };
  }

  /**
   * 驗證密碼
   */
  public async verifyPassword(inputPassword: string): Promise<boolean> {
    if (!this.currentPasswordData) {
      console.error('密碼系統未初始化');
      return false;
    }

    try {
      const saltBuffer = Buffer.from(this.currentPasswordData.salt, 'hex');
      const hashBuffer = pbkdf2Sync(
        inputPassword, 
        saltBuffer, 
        this.currentPasswordData.iterations, 
        64, 
        'sha512'
      );
      
      const storedHashBuffer = Buffer.from(this.currentPasswordData.hash, 'hex');
      
      // 使用固定時間比較防止時序攻擊
      return timingSafeEqual(hashBuffer, storedHashBuffer);
    } catch (error) {
      console.error('密碼驗證錯誤:', error);
      return false;
    }
  }

  /**
   * 從數據庫初始化密碼
   */
  public async initializeFromDatabase(storedPasswordJson: string | null): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      if (storedPasswordJson) {
        console.log('從數據庫載入安全密碼數據');
        this.currentPasswordData = JSON.parse(storedPasswordJson);
      } else {
        console.log('創建預設安全密碼');
        // 創建預設密碼 "admin123"
        this.currentPasswordData = this.hashPasswordSecure('admin123');
        console.warn('使用預設密碼 "admin123"，請立即更改');
      }
      
      this.isInitialized = true;
    } catch (error) {
      console.error('密碼初始化失敗:', error);
      // 安全失敗處理
      this.currentPasswordData = this.hashPasswordSecure('admin123');
      this.isInitialized = true;
    }
  }

  /**
   * 更新密碼
   */
  public updatePassword(newPassword: string): PasswordData {
    console.log('更新管理員密碼');
    this.currentPasswordData = this.hashPasswordSecure(newPassword);
    return this.currentPasswordData;
  }

  /**
   * 獲取當前密碼數據（用於儲存到數據庫）
   */
  public getCurrentPasswordData(): string | null {
    if (!this.currentPasswordData) {
      return null;
    }
    return JSON.stringify(this.currentPasswordData);
  }

  /**
   * 檢查是否已初始化
   */
  public isPasswordInitialized(): boolean {
    return this.isInitialized && this.currentPasswordData !== null;
  }
}