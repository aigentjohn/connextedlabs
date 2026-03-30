/**
 * Safe Clipboard Utility
 * 
 * Provides clipboard operations with proper error handling and fallbacks
 * to prevent unhandled promise rejections from clipboard permission errors.
 */

import { toast } from 'sonner';

/**
 * Safely write text to clipboard with fallback methods
 * @param text - The text to copy
 * @param label - Label for success/info messages (e.g., "Link", "SQL")
 * @param inputElement - Optional input element to use for fallback selection
 */
export async function copyToClipboard(
  text: string,
  label: string = 'Text',
  inputElement?: HTMLInputElement
): Promise<boolean> {
  // Method 1: Try modern Clipboard API
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
    return true;
  } catch (clipboardError) {
    // Clipboard API failed - silently log and try fallback
    console.log('[Clipboard] Modern API unavailable, using fallback');
  }

  // Method 2: Try input element selection + execCommand
  if (inputElement) {
    try {
      inputElement.select();
      inputElement.setSelectionRange(0, 99999); // For mobile devices
      const success = document.execCommand('copy');
      if (success) {
        toast.success(`${label} copied to clipboard!`);
        return true;
      }
    } catch (execError) {
      console.log('[Clipboard] execCommand fallback failed');
    }
  }

  // Method 3: Create temporary input for selection
  try {
    const tempInput = document.createElement('input');
    tempInput.value = text;
    tempInput.style.position = 'fixed';
    tempInput.style.opacity = '0';
    document.body.appendChild(tempInput);
    
    tempInput.select();
    tempInput.setSelectionRange(0, 99999);
    const success = document.execCommand('copy');
    
    document.body.removeChild(tempInput);
    
    if (success) {
      toast.success(`${label} copied to clipboard!`);
      return true;
    }
  } catch (tempError) {
    console.log('[Clipboard] Temporary input fallback failed');
  }

  // All methods failed - show manual copy instruction
  if (inputElement) {
    inputElement.select();
    toast.info(`${label} selected - press Ctrl+C (or Cmd+C) to copy`);
  } else {
    toast.info(`Unable to copy automatically. Please copy manually.`);
  }
  
  return false;
}

/**
 * Check if clipboard API is available
 */
export function isClipboardAvailable(): boolean {
  return !!(navigator.clipboard && navigator.clipboard.writeText);
}
