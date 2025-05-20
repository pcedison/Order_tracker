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
  
  // 從數據庫初始化密碼 - 簡化版本，只使用單一來源
  public async initializePasswordFromDatabase(password: string | null): Promise<void> {
    // 檢查是否已初始化過 (避免重複)
    if (AuthService.passwordInitialized) {
      console.log('密碼已初始化，跳過重複操作');
      return;
    }
    
    // 從數據庫載入密碼
    if (password) {
      console.log('從數據庫載入密碼');
      
      // 更新靜態密碼和實例密碼
      AuthService.currentPassword = password;
      this.adminPassword = password;
      
      // 同步到環境變量
      process.env.ADMIN_PASSWORD = password;
      
      // 標記密碼已初始化
      AuthService.passwordInitialized = true;
      console.log('密碼已成功從數據庫初始化');
    } else {
      // 數據庫中沒有密碼，使用環境變量
      console.log('數據庫中無密碼，使用環境變量密碼');
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

  // 簡化的密碼驗證方法 - 確保只使用一個密碼
  async verifyPassword(password: string): Promise<boolean> {
    try {
      console.log('開始驗證管理員密碼');
      
      // 始終從靜態變量獲取當前密碼
      const currentAdminPassword = AuthService.currentPassword;
      
      // 診斷信息
      console.log(`密碼已載入，長度: ${currentAdminPassword?.length || 0}, 
                  哈希模式: ${(currentAdminPassword?.length === 64 && /^[0-9a-f]+$/.test(currentAdminPassword || '')) ? '是' : '否'}`);
      
      if (!currentAdminPassword) {
        console.error('管理員密碼未配置');
        throw new Error('管理員密碼未配置');
      }
      
      // 計算輸入密碼的哈希值
      const hashedInput = this.hashPassword(password);
      
      // 根據當前存儲的密碼格式進行驗證
      if (currentAdminPassword.length === 64 && /^[0-9a-f]+$/.test(currentAdminPassword)) {
        // 哈希模式 - 安全比較
        console.log('使用哈希模式驗證密碼');
        const a = Buffer.from(hashedInput);
        const b = Buffer.from(currentAdminPassword);
        
        if (a.length !== b.length) {
          console.log('密碼長度不匹配');
          return false;
        }
        
        // 固定時間比較
        let diff = 0;
        for (let i = 0; i < a.length; i++) {
          diff |= (a[i] ^ b[i]);
        }
        
        const result = diff === 0;
        console.log(`密碼驗證結果: ${result ? '成功' : '失敗'}`);
        return result;
      } else {
        // 明文模式
        console.log('使用明文模式驗證密碼');
        const result = password === currentAdminPassword;
        console.log(`密碼驗證結果: ${result ? '成功' : '失敗'}`);
        return result;
      }
    } catch (error) {
      console.error('密碼驗證過程中發生錯誤:', error);
      return false; // 安全起見，錯誤時拒絕驗證
    }
  }
  
  // 更新密碼 - 簡化版本，只使用單一密碼源
  public updatePassword(newHashedPassword: string): void {
    console.log('更新管理員密碼');
    
    // 1. 更新靜態密碼變量 (所有實例共享)
    AuthService.currentPassword = newHashedPassword;
    
    // 2. 更新當前實例的密碼
    this.adminPassword = newHashedPassword;
    
    // 3. 更新環境變量
    process.env.ADMIN_PASSWORD = newHashedPassword;
    
    // 4. 設置初始化標記
    AuthService.passwordInitialized = true;
    
    console.log('管理員密碼更新完成');
  }
  
  // 獲取當前密碼
  public getCurrentPassword(): string {
    return AuthService.currentPassword;
  }
}
