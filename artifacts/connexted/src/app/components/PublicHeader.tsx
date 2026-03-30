import { useNavigate } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Users } from 'lucide-react';

interface PublicHeaderProps {
  showAuthButtons?: boolean;
  brandName?: string;
  onBrandClick?: () => void;
}

export default function PublicHeader({ 
  showAuthButtons = true,
  brandName = 'CONNEXTED',
  onBrandClick
}: PublicHeaderProps) {
  const navigate = useNavigate();

  const handleBrandClick = () => {
    if (onBrandClick) {
      onBrandClick();
    } else {
      navigate('/');
    }
  };

  return (
    <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <button 
            onClick={handleBrandClick}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-cyan-600 flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col items-start">
              <span className="font-bold text-gray-900 text-sm leading-none">{brandName}</span>
              <span className="text-[10px] text-gray-600 leading-none">by Connexted Labs</span>
            </div>
          </button>
          {showAuthButtons && (
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate('/login')}>
                Sign In
              </Button>
              <Button onClick={() => navigate('/login')} className="bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700">
                Claim Your Invite
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}