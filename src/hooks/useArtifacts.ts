import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Artifact, fetchArtifactsFromSheet, sampleArtifacts } from '@/data/artifacts';

// Fetch artifacts from database
async function fetchArtifactsFromDB(): Promise<Artifact[]> {
  const { data, error } = await supabase
    .from('artifacts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching from database:', error);
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    date: row.date || 'Unknown date',
    description: row.description || 'No description available.',
    photos: row.photos || [],
  }));
}

// Combined fetch: DB first, then Google Sheets fallback, then sample data
async function fetchAllArtifacts(): Promise<Artifact[]> {
  // First try database
  const dbArtifacts = await fetchArtifactsFromDB();
  if (dbArtifacts.length > 0) {
    return dbArtifacts;
  }

  // Fallback to Google Sheets (for backward compatibility)
  const sheetArtifacts = await fetchArtifactsFromSheet();
  if (sheetArtifacts.length > 0) {
    return sheetArtifacts;
  }

  // Final fallback to sample data
  return sampleArtifacts;
}

export function useArtifacts() {
  return useQuery({
    queryKey: ['artifacts'],
    queryFn: fetchAllArtifacts,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
  });
}

export type { Artifact };
