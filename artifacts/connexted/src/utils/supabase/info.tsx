export const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID as string
  ?? (() => { throw new Error('VITE_SUPABASE_PROJECT_ID is required') })();

export const publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
  ?? (() => { throw new Error('VITE_SUPABASE_ANON_KEY is required') })();
