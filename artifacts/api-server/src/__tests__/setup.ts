// Set required environment variables before any module is imported.
// Without these, the Supabase client initialization throws on import.
process.env.VITE_SUPABASE_URL = 'https://test-project.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.PORT = '3001';
process.env.NODE_ENV = 'test';
