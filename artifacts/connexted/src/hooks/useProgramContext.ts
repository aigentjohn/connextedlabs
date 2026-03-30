import { useState, useEffect } from 'react';

export interface ProgramContext {
  program_id: string;
  program_journey_id: string;
  program_name: string;
  journey_title: string;
}

export function useProgramContext() {
  const [context, setContext] = useState<ProgramContext | null>(null);

  useEffect(() => {
    // Read from localStorage
    const stored = localStorage.getItem('program_context');
    if (stored) {
      try {
        setContext(JSON.parse(stored));
      } catch (error) {
        console.error('Error parsing program context:', error);
      }
    }
  }, []);

  const clearContext = () => {
    localStorage.removeItem('program_context');
    setContext(null);
  };

  return { context, clearContext };
}
