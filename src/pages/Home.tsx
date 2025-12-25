import { Link } from "react-router-dom";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import museumLogo from "@/assets/museum-logo-full.jpg";

const Home = () => {
  return (
    <main className="min-h-[100dvh] w-full flex flex-col items-center justify-center bg-charcoal-deep p-6">
      {/* Museum Logo */}
      <div className="mb-12 animate-fade-in">
        <img
          src={museumLogo}
          alt="Musée des Ondes Emile Berliner"
          className="max-w-xs md:max-w-md w-full h-auto"
        />
      </div>

      {/* Scan Button */}
      <Link to="/scan">
        <Button
          size="lg"
          className="bg-gold hover:bg-gold/90 text-charcoal-deep font-display text-lg px-8 py-6 rounded-full shadow-gold transition-all duration-300 hover:scale-105"
        >
          <Camera className="mr-3 h-6 w-6" />
          Scanner un artefact
        </Button>
      </Link>

      {/* Hidden SEO content */}
      <h1 className="sr-only">
        Musée des Ondes Emile Berliner - Interactive Collection Viewer
      </h1>
    </main>
  );
};

export default Home;
