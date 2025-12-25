import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Scan } from "lucide-react";
import museumLogo from "@/assets/museum-logo-white.png";

const Home = () => {
  return (
    <main className="min-h-[100dvh] w-full flex flex-col items-center justify-center bg-background relative overflow-hidden">
      {/* Subtle spotlight effect */}
      <div className="absolute inset-0 bg-spotlight pointer-events-none" />
      
      {/* Film grain texture */}
      <div className="absolute inset-0 texture-grain pointer-events-none" />

      {/* Decorative lines */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-32 bg-gradient-to-b from-transparent via-primary/20 to-transparent" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-px h-32 bg-gradient-to-t from-transparent via-primary/20 to-transparent" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center px-8">
        {/* Museum Logo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-16"
        >
          <img
            src={museumLogo}
            alt="Musée des Ondes Emile Berliner"
            className="w-auto h-12 md:h-16 object-contain"
          />
        </motion.div>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="text-muted-foreground font-body text-sm md:text-base tracking-widest uppercase mb-12 text-center"
        >
          Interactive Collection Experience
        </motion.p>

        {/* Scan Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <Link to="/scan">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="group relative flex items-center gap-4 px-10 py-5 rounded-full bg-primary/10 border border-primary/30 text-primary font-body font-medium text-base tracking-wide transition-all duration-300 hover:bg-primary/15 hover:border-primary/50"
            >
              {/* Glow effect */}
              <span className="absolute inset-0 rounded-full bg-primary/5 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <Scan className="w-5 h-5 relative z-10" />
              <span className="relative z-10">Scanner un artefact</span>
              
              {/* Decorative corner accents */}
              <span className="absolute top-0 left-4 w-8 h-px bg-gradient-to-r from-primary/50 to-transparent" />
              <span className="absolute bottom-0 right-4 w-8 h-px bg-gradient-to-l from-primary/50 to-transparent" />
            </motion.button>
          </Link>
        </motion.div>

      </div>

      {/* Hidden SEO content */}
      <h1 className="sr-only">
        Musée des Ondes Emile Berliner - Interactive Collection Viewer
      </h1>
    </main>
  );
};

export default Home;
