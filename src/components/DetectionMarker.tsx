import { forwardRef } from "react";
import { motion } from "framer-motion";
import { Info } from "lucide-react";

interface DetectionMarkerProps {
  x: number;
  y: number;
  onClick: () => void;
  artifactName: string;
}

const DetectionMarker = forwardRef<HTMLButtonElement, DetectionMarkerProps>(
  ({ x, y, onClick, artifactName }, ref) => {
    return (
      <motion.button
        ref={ref}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        onClick={onClick}
        className="absolute z-30 group"
        style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)" }}
        aria-label={`View details for ${artifactName}`}
      >
        {/* Outer pulse ring */}
        <span className="absolute inset-0 rounded-full animate-pulse-gold" />

        {/* Glow effect */}
        <span className="absolute -inset-4 rounded-full bg-gradient-radial from-primary/20 to-transparent blur-lg" />

        {/* Main button */}
        <motion.span
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="relative flex items-center justify-center w-14 h-14 rounded-full bg-primary/20 backdrop-blur-md border border-primary/50 shadow-gold"
        >
          <Info className="w-5 h-5 text-primary" />
        </motion.span>

        {/* Tooltip on hover */}
        <motion.span
          initial={{ opacity: 0, y: 8 }}
          whileHover={{ opacity: 1, y: 0 }}
          className="absolute top-full mt-3 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-card/95 backdrop-blur-md border border-border text-xs font-body text-foreground whitespace-nowrap shadow-card tracking-wide"
        >
          {artifactName}
        </motion.span>
      </motion.button>
    );
  },
);

DetectionMarker.displayName = "DetectionMarker";

export default DetectionMarker;
