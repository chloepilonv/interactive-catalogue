import { motion } from "framer-motion";
import { Settings } from "lucide-react";
import { Link } from "react-router-dom";
import museumLogo from "@/assets/museum-logo.png";

const Header = () => {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 inset-x-0 z-40 safe-top"
    >
      <div className="flex items-center justify-between px-4 py-3">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <img
            src={museumLogo}
            alt="Musée des Ondes Emile Berliner"
            className="h-8 w-auto brightness-0 invert"
          />
        </div>

        <div className="flex items-center gap-3">
          {/* Status indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/80 backdrop-blur-sm border border-border/50">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-body text-foreground/80 uppercase tracking-wide">
              Live
            </span>
          </div>

          {/* Admin link */}
          <Link
            to="/auth"
            className="p-2 rounded-full bg-secondary/80 backdrop-blur-sm border border-border/50 hover:bg-secondary transition-colors"
          >
            <Settings className="w-4 h-4 text-foreground/70" />
          </Link>
        </div>
      </div>
    </motion.header>
  );
};

export default Header;
