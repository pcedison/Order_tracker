import { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from '@/context/AdminContext';
import { Lock, LogIn } from 'lucide-react';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { login } = useAdmin();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      toast({
        title: "請輸入密碼",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const success = await login(password);
      
      if (success) {
        toast({
          title: "登入成功",
          description: "歡迎，管理員！"
        });
        setPassword('');
      } else {
        toast({
          title: "登入失敗",
          description: "密碼錯誤，請重新輸入",
          variant: "destructive"
        });
      }
      
    } catch (error) {
      toast({
        title: "登入失敗",
        description: "密碼錯誤，請重試",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="relative">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          <Lock className="inline mr-2 text-purple-500" size={16} />
          管理員密碼
        </label>
        <div className="relative">
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="請輸入管理員密碼"
            className="input-modern w-full pl-12 pr-4 py-3 rounded-xl text-gray-800"
            disabled={isLoading}
            required
          />
          <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
        </div>
      </div>
      
      <button
        type="submit"
        disabled={isLoading || !password.trim()}
        className="w-full gradient-primary text-white font-semibold py-3 px-6 rounded-xl btn-3d disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
      >
        {isLoading ? (
          <div className="flex items-center justify-center space-x-2">
            <div className="loading-spinner"></div>
            <span>登入中...</span>
          </div>
        ) : (
          <div className="flex items-center justify-center space-x-2">
            <LogIn size={16} />
            <span>登入</span>
          </div>
        )}
      </button>

      <div className="text-center">
        <p className="text-xs text-gray-500">
          登入後可存取系統配置和管理員功能
        </p>
      </div>
    </form>
  );
}