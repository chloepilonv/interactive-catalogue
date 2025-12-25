import { useQuery } from "@tanstack/react-query";
import { fetchArtifactsFromSheet, sampleArtifacts, Artifact } from "@/data/artifacts";

export function useArtifacts() {
  return useQuery({
    queryKey: ['artifacts'],
    queryFn: fetchArtifactsFromSheet,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    refetchOnWindowFocus: true, // Refresh when user returns to app
    select: (data) => {
      // If no data from sheet, use sample artifacts for demo
      return data.length > 0 ? data : sampleArtifacts;
    },
  });
}

export type { Artifact };
