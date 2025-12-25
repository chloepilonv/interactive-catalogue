import { motion } from "framer-motion";
import { Info } from "lucide-react";

interface DetectionMarkerProps {
  x: number;
  y: number;
  onClick: () => void;
  artifactName: string;
}

const DetectionMarker = ({ x, y, onClick, artifactName }: DetectionMarkerProps) => {
  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      onClick={onClick}
      className="absolute z-20 group"
      style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)" }}
      aria-label={`View details for ${artifactName}`}
    >
      {/* Outer pulse ring */}
      <span className="absolute inset-0 rounded-full bg-primary/30 animate-pulse-gold" />
      
      {/* Inner glow */}
      <span className="absolute -inset-2 rounded-full bg-gradient-radial from-primary/20 to-transparent blur-md" />
      
      {/* Main button */}
      <motion.span
        whileHover={{ scale: 1.15 }}
        whileTap={{ scale: 0.95 }}
        className="relative flex items-center justify-center w-12 h-12 rounded-full bg-gradient-gold shadow-gold border border-gold-light/30"
      >
        <Info className="w-5 h-5 text-primary-foreground" />
      </motion.span>

      {/* Tooltip on hover */}
      <motion.span
        initial={{ opacity: 0, y: 5 }}
        whileHover={{ opacity: 1, y: 0 }}
        className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-card border border-border text-sm font-body text-foreground whitespace-nowrap shadow-card"
      >
        {artifactName}
      </motion.span>
    </motion.button>
  );
};

export default DetectionMarker;
