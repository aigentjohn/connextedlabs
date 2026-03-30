import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface ProgramContextData {
  program: {
    id: string;
    name: string;
    slug: string;
  } | null;
  journey: {
    id: string;
    title: string;
  } | null;
  loading: boolean;
}

export function useContainerProgramContext(programId?: string | null, journeyId?: string | null): ProgramContextData {
  const [program, setProgram] = useState<ProgramContextData['program']>(null);
  const [journey, setJourney] = useState<ProgramContextData['journey']>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (programId) {
      fetchProgramContext();
    } else {
      setProgram(null);
      setJourney(null);
    }
  }, [programId, journeyId]);

  const fetchProgramContext = async () => {
    if (!programId) return;

    setLoading(true);
    try {
      // Fetch program
      const { data: programData, error: programError } = await supabase
        .from('programs')
        .select('id, name, slug')
        .eq('id', programId)
        .single();

      if (programError) throw programError;
      setProgram(programData);

      // Fetch journey if journeyId provided
      if (journeyId) {
        const { data: journeyData, error: journeyError } = await supabase
          .from('program_journeys')
          .select('id, title')
          .eq('id', journeyId)
          .single();

        if (journeyError) throw journeyError;
        setJourney(journeyData);
      }
    } catch (error) {
      console.error('Error fetching program context:', error);
    } finally {
      setLoading(false);
    }
  };

  return { program, journey, loading };
}
