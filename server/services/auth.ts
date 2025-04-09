import { createHash } from 'crypto';

export class AuthService {
  private adminPassword: string;

  constructor() {
    // Get admin password from environment variable
    this.adminPassword = process.env.ADMIN_PASSWORD || '';
    
    if (!this.adminPassword) {
      console.warn('Admin password not provided in environment variables');
    }
  }

  // Hash a password using SHA-256
  public hashPassword(password: string): string {
    return createHash('sha256').update(password).digest('hex');
  }

  // Verify if the provided password matches the admin password
  async verifyPassword(password: string): Promise<boolean> {
    if (!this.adminPassword) {
      throw new Error('Admin password not configured');
    }
    
    // 支持旧系统的明文密码以及新系统的哈希密码
    // 检查当前存储的密码是否是哈希值（假设哈希值长度为64个字符）
    if (this.adminPassword.length === 64 && /^[0-9a-f]+$/.test(this.adminPassword)) {
      // 存储的是哈希密码，对输入的密码进行哈希再比较
      const hashedPassword = this.hashPassword(password);
      return hashedPassword === this.adminPassword;
    } else {
      // 存储的是明文密码，直接比较
      return password === this.adminPassword;
    }
  }
}
