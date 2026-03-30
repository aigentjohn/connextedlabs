import { useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { ShoppingCart } from 'lucide-react';

interface KitCommerceButtonProps {
  /**
   * The Kit product URL (e.g., "https://aigent-john.kit.com/products/connexted-membership")
   */
  productUrl: string;
  
  /**
   * Button text to display
   */
  buttonText?: string;
  
  /**
   * Optional className for styling the button
   */
  className?: string;
  
  /**
   * Button size variant
   */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  
  /**
   * Button variant
   */
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  
  /**
   * Show shopping cart icon
   */
  showIcon?: boolean;
}

/**
 * KitCommerceButton Component
 * 
 * Embeds a ConvertKit Commerce product button.
 * Automatically loads the Kit commerce.js script.
 * 
 * Usage:
 * <KitCommerceButton 
 *   productUrl="https://aigent-john.kit.com/products/connexted-membership"
 *   buttonText="Buy Membership"
 *   size="lg"
 * />
 */
export function KitCommerceButton({ 
  productUrl, 
  buttonText = 'Buy Now',
  className = '',
  size = 'default',
  variant = 'default',
  showIcon = true
}: KitCommerceButtonProps) {
  
  useEffect(() => {
    // Check if the commerce script is already loaded
    const existingScript = document.querySelector('script[src="https://aigent-john.kit.com/commerce.js"]');
    
    if (!existingScript) {
      // Create and append the commerce script
      const script = document.createElement('script');
      script.src = 'https://aigent-john.kit.com/commerce.js';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
  }, []);

  return (
    <Button
      asChild
      size={size}
      variant={variant}
      className={className}
    >
      <a 
        className="convertkit-button" 
        href={productUrl}
        data-commerce
      >
        {buttonText}
        {showIcon && <ShoppingCart className="w-4 h-4 ml-2" />}
      </a>
    </Button>
  );
}

export default KitCommerceButton;
