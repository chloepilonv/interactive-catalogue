# Espace Berliner - Interactive Collection Viewer

An interactive web application for museum visitors to explore and learn about artifacts in the Espace Berliner collection.

## Features

- **Artifact Scanning**: Visitors can scan artifacts to get detailed information
- **Interactive Experience**: Smooth animations and modern UI for an engaging experience
- **Admin Dashboard**: Manage the artifact database and collection
- **Mobile-First**: Designed for use on mobile devices in the museum

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui
- **Animations**: Framer Motion
- **Backend**: Supabase (database & auth)
- **State Management**: TanStack Query

## Getting Started

### Prerequisites

- Node.js 18+
- npm or bun

### Installation

```bash
# Clone the repository
git clone https://github.com/chloepilonv/moebcatalogue.git
cd moebcatalogue

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Start development server
npm run dev
```

### Environment Variables

Create a `.env` file with:

```env
VITE_SUPABASE_PROJECT_ID=your_project_id
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
VITE_SUPABASE_URL=https://your_project.supabase.co
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## License

MIT
