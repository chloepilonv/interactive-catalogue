import { forwardRef } from "react";
import { motion } from "framer-motion";
import { Eye } from "lucide-react";

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
        initial={{ scale: 0.8, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        onClick={onClick}
        className="absolute z-30 left-1/2 -translate-x-1/2"
        style={{ top: `${y}%` }}
        aria-label={`View details for ${artifactName}`}
      >
        {/* Pulsing background glow */}
        <motion.span
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -inset-2 rounded-full bg-primary/30 blur-md"
        />

        {/* Main CTA button */}
        <motion.span
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative flex items-center gap-3 px-6 py-3 rounded-full bg-primary text-primary-foreground font-body font-medium text-sm tracking-wide shadow-lg border border-primary/50"
        >
          <Eye className="w-4 h-4" />
          <span className="max-w-[200px] truncate">{artifactName}</span>
          <span className="text-primary-foreground/70">→</span>
        </motion.span>
      </motion.button>
    );
  },
);

DetectionMarker.displayName = "DetectionMarker";

export default DetectionMarker;
