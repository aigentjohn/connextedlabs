import React, { useEffect, useState } from 'react';
import { AccountManagement } from '@/app/components/admin/AccountManagement';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

export default function AccountManagementPage() {
  const { user } = useAuth();
  const [accessToken, setAccessToken] = useState<string>('');

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        setAccessToken(session.access_token);
      }
    };
    getSession();
  }, []);

  if (!user || !accessToken) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return <AccountManagement currentUserId={user.id} accessToken={accessToken} />;
}
