import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Badge } from '@/app/components/ui/badge';
import { DollarSign, Crown } from 'lucide-react';

interface DirectorInfoProps {
  directorId: string | null;
  containerType: string;
  containerName: string;
}

interface Director {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

export default function DirectorInfo({ directorId, containerType, containerName }: DirectorInfoProps) {
  const [director, setDirector] = useState<Director | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (directorId) {
      fetchDirector();
    } else {
      setLoading(false);
    }
  }, [directorId]);

  const fetchDirector = async () => {
    if (!directorId) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, avatar')
        .eq('id', directorId)
        .single();

      if (error) throw error;
      setDirector(data);
    } catch (error) {
      console.error('Error fetching director:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Crown className="w-5 h-5 text-indigo-600" />
            Director
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (!director) {
    return null;
  }

  return (
    <Card className="border-indigo-200 bg-indigo-50/50">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Crown className="w-5 h-5 text-indigo-600" />
          Financial Sponsor & Director
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <Avatar className="w-12 h-12">
            <AvatarImage src={director.avatar || undefined} />
            <AvatarFallback className="bg-indigo-600 text-white">
              {director.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-semibold text-gray-900">{director.name}</p>
              <Badge variant="outline" className="bg-indigo-100 text-indigo-800 border-indigo-300">
                <DollarSign className="w-3 h-3 mr-1" />
                Financially Responsible
              </Badge>
            </div>
            <p className="text-sm text-gray-600">{director.email}</p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-indigo-200">
          <p className="text-xs text-gray-600">
            <strong>{director.name}</strong> is the director of this {containerType}, responsible for 
            financial sponsorship and management. Directors have full administrative control to 
            ensure the {containerType} remains accessible and valuable to members.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}