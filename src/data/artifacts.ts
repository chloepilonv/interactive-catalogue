export interface Artifact {
  id: string;
  name: string;
  nameFr?: string;
  description: string;
  date: string;
  images: string[];
  category: string;
  inventoryNumber?: string;
}

// Sample museum collection data
export const artifacts: Artifact[] = [
  {
    id: "1",
    name: "Berliner Gramophone",
    nameFr: "Gramophone Berliner",
    description: "The original gramophone invented by Emile Berliner in 1887. This revolutionary device used flat disc records instead of cylinders, fundamentally changing the recording industry. The hand-cranked mechanism and distinctive horn became iconic symbols of the early audio era.",
    date: "1895",
    images: ["/placeholder.svg"],
    category: "Phonographs",
    inventoryNumber: "MOEB-001"
  },
  {
    id: "2",
    name: "Victor Talking Machine",
    nameFr: "Machine Parlante Victor",
    description: "An early Victor Talking Machine featuring the famous 'His Master's Voice' trademark with Nipper the dog. This model represents the golden age of acoustic recording and was one of the most popular phonographs of its time.",
    date: "1906",
    images: ["/placeholder.svg"],
    category: "Phonographs",
    inventoryNumber: "MOEB-002"
  },
  {
    id: "3",
    name: "Shellac Record Collection",
    nameFr: "Collection de Disques Shellac",
    description: "A collection of original 78 RPM shellac records from the early 20th century. These fragile discs contain rare recordings of classical music, jazz, and spoken word that document the early days of the recording industry.",
    date: "1910-1950",
    images: ["/placeholder.svg"],
    category: "Records",
    inventoryNumber: "MOEB-003"
  },
  {
    id: "4",
    name: "Microphone Ribbon RCA",
    nameFr: "Microphone à Ruban RCA",
    description: "A classic RCA 44-BX ribbon microphone, considered one of the finest broadcast microphones ever made. Its distinctive art deco design and warm, rich sound quality made it a staple in radio stations and recording studios.",
    date: "1931",
    images: ["/placeholder.svg"],
    category: "Microphones",
    inventoryNumber: "MOEB-004"
  },
  {
    id: "5",
    name: "Edison Cylinder Phonograph",
    nameFr: "Phonographe à Cylindre Edison",
    description: "Thomas Edison's original cylinder phonograph design that preceded Berliner's disc-based gramophone. This device recorded and played back sound using wax cylinders, representing the earliest practical sound recording technology.",
    date: "1888",
    images: ["/placeholder.svg"],
    category: "Phonographs",
    inventoryNumber: "MOEB-005"
  }
];
