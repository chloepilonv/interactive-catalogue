export interface Artifact {
  id: string;
  name: string;
  date: string;
  description: string;
  photos: string[];
}

// Parse CSV text into array of artifacts
export function parseCSV(csvText: string): Artifact[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return []; // Only headers, no data
  
  const artifacts: Artifact[] = [];
  
  // Skip header row, process data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    // Parse CSV properly handling commas within quotes
    const values = parseCSVLine(line);
    
    if (values.length >= 4) {
      const [name, date, description, photos] = values;
      
      // Parse photos - can be comma-separated URLs or single URL
      const photoUrls = photos
        ? photos.split(/[,;]/).map(url => url.trim()).filter(Boolean)
        : [];
      
      artifacts.push({
        id: `artifact-${i}`,
        name: name?.trim() || 'Untitled',
        date: date?.trim() || 'Unknown date',
        description: description?.trim() || 'No description available.',
        photos: photoUrls,
      });
    }
  }
  
  return artifacts;
}

// Parse a single CSV line, handling quoted fields
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // Skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current); // Don't forget the last field
  return result;
}

// Google Sheets CSV URL
export const GOOGLE_SHEETS_CSV_URL = 
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vRH7vfi5RhCAets22sDVjlPj4VoAu6abH3citoabff0U12ZVgQWVwv8-9mKHC9HJ5hL8paewsqypsoP/pub?output=csv';

// Fetch artifacts from Google Sheets
export async function fetchArtifactsFromSheet(): Promise<Artifact[]> {
  try {
    const response = await fetch(GOOGLE_SHEETS_CSV_URL, {
      cache: 'no-store', // Always get fresh data
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch spreadsheet');
    }
    
    const csvText = await response.text();
    return parseCSV(csvText);
  } catch (error) {
    console.error('Error fetching artifacts:', error);
    return [];
  }
}

// Sample data for demo/fallback when sheet is empty
export const sampleArtifacts: Artifact[] = [
  {
    id: "sample-1",
    name: "Berliner Gramophone",
    date: "1895",
    description: "The original gramophone invented by Emile Berliner in 1887. This revolutionary device used flat disc records instead of cylinders, fundamentally changing the recording industry.",
    photos: [],
  },
  {
    id: "sample-2",
    name: "Victor Talking Machine",
    date: "1906",
    description: "An early Victor Talking Machine featuring the famous 'His Master's Voice' trademark with Nipper the dog. One of the most popular phonographs of its time.",
    photos: [],
  },
  {
    id: "sample-3",
    name: "RCA Ribbon Microphone",
    date: "1931",
    description: "A classic RCA 44-BX ribbon microphone, considered one of the finest broadcast microphones ever made. Its distinctive art deco design made it a staple in recording studios.",
    photos: [],
  },
];
