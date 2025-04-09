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
  private hashPassword(password: string): string {
    return createHash('sha256').update(password).digest('hex');
  }

  // Verify if the provided password matches the admin password
  async verifyPassword(password: string): Promise<boolean> {
    if (!this.adminPassword) {
      throw new Error('Admin password not configured');
    }
    
    // For improved security, you would typically hash passwords and compare hashes
    // But for direct migration from the original system, we're comparing plain text
    return password === this.adminPassword;
  }
}
