import { motion } from "framer-motion";
import { Settings } from "lucide-react";
import { Link } from "react-router-dom";
import museumLogo from "@/assets/museum-logo-white-new.png";

const Header = () => {
  return (
    <motion.header
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="fixed top-0 inset-x-0 z-40 safe-top"
    >
      <div className="flex items-center justify-between px-5 py-4">
        {/* Logo */}
        <Link to="/" className="flex items-center">
          <img
            src={museumLogo}
            alt="Espace Berliner"
            className="h-10 w-auto opacity-90"
          />
        </Link>

        <div className="flex items-center gap-3">
          {/* Status indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/60 backdrop-blur-md border border-border/40">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-glow" />
            <span className="text-[10px] font-body text-muted-foreground uppercase tracking-widest">
              En direct
            </span>
          </div>

          {/* Admin link */}
          <Link
            to="/auth"
            className="p-2.5 rounded-full bg-secondary/60 backdrop-blur-md border border-border/40 hover:bg-secondary/80 transition-all duration-300 hover:border-primary/30"
          >
            <Settings className="w-4 h-4 text-muted-foreground" />
          </Link>
        </div>
      </div>
    </motion.header>
  );
};

export default Header;
