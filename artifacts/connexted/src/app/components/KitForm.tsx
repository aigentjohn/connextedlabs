import { useEffect, useRef } from 'react';

interface KitFormProps {
  /**
   * The Kit form UID (e.g., "03ed58c6b1")
   */
  formId: string;
  
  /**
   * The script source URL. If not provided, uses standard Kit domain.
   * Example: "https://aigent-john.kit.com/03ed58c6b1/index.js"
   */
  scriptSrc?: string;
  
  /**
   * Optional className for styling the container
   */
  className?: string;
  
  /**
   * Use iframe embed instead of script (more reliable, avoids CORS issues)
   */
  useIframe?: boolean;
}

/**
 * KitForm Component
 * 
 * Embeds a ConvertKit form using JavaScript embed code or iframe.
 * The form will auto-update when changes are made in Kit.
 * 
 * Usage:
 * <KitForm 
 *   formId="03ed58c6b1" 
 *   scriptSrc="https://aigent-john.kit.com/03ed58c6b1/index.js"
 *   useIframe={true}  // Recommended to avoid CORS issues
 * />
 */
export function KitForm({ formId, scriptSrc, className = '', useIframe = true }: KitFormProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  // If using iframe, render it directly
  if (useIframe) {
    const iframeSrc = scriptSrc 
      ? scriptSrc.replace('/index.js', '') 
      : `https://f.convertkit.com/${formId}`;

    return (
      <div className={className} data-kit-form-container>
        <iframe
          src={iframeSrc}
          style={{
            width: '100%',
            height: '500px',
            border: 'none',
            borderRadius: '8px',
          }}
          title="Newsletter Signup Form"
          loading="lazy"
        />
      </div>
    );
  }

  // Script-based embed (legacy)
  useEffect(() => {
    // Suppress fetch errors from Kit's background image loading
    const originalFetch = window.fetch;
    const suppressedUrls = ['convertkit.com', 'pages.convertkit.com'];
    
    window.fetch = async (...args) => {
      try {
        const url = args[0]?.toString() || '';
        const shouldSuppress = suppressedUrls.some(domain => url.includes(domain));
        
        if (shouldSuppress) {
          // Try the fetch, but suppress errors in console
          return await originalFetch(...args);
        }
        
        return await originalFetch(...args);
      } catch (error) {
        // Silently fail for Kit resources
        if (args[0]?.toString().includes('convertkit')) {
          return new Response(null, { status: 200 });
        }
        throw error;
      }
    };

    // Create script element
    const script = document.createElement('script');
    script.async = true;
    script.setAttribute('data-uid', formId);
    
    // Use custom source if provided, otherwise use standard Kit domain
    script.src = scriptSrc || `https://f.convertkit.com/${formId}/index.js`;
    
    // Append to container
    if (containerRef.current) {
      containerRef.current.appendChild(script);
      scriptRef.current = script;
    }

    // Cleanup function
    return () => {
      if (scriptRef.current && scriptRef.current.parentNode) {
        scriptRef.current.parentNode.removeChild(scriptRef.current);
      }
      // Restore original fetch
      window.fetch = originalFetch;
    };
  }, [formId, scriptSrc]);

  return (
    <div 
      ref={containerRef} 
      className={className}
      data-kit-form-container
    />
  );
}

export default KitForm;