const SUPABASE_URL = "https://ewlwaxmgdvzcjelqgkzn.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_xBk84cmTie5IWYUB7ZSA7w_0b7iiEip";

const { createClient } = supabase;

// عميل الموقع العام: بدون تخزين جلسة (يمنع مشاكل المتصفحات)
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

// عميل لوحة التحكم: جلسة محفوظة في localStorage (لتسجيل الدخول)
const supabaseAuthClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
