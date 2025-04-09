import { createClient } from '@supabase/supabase-js';

// 从环境变量中获取 Supabase URL 和 key
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase URL or key not provided in environment variables');
}

// 创建 Supabase 客户端
export const supabase = createClient(supabaseUrl, supabaseKey);