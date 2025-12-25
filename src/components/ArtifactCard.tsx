import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, Image as ImageIcon } from "lucide-react";
import { Artifact } from "@/data/artifacts";

interface ArtifactCardProps {
  artifact: Artifact | null;
  isOpen: boolean;
  onClose: () => void;
}

const ArtifactCard = ({ artifact, isOpen, onClose }: ArtifactCardProps) => {
  if (!artifact) return null;

  const hasPhotos = artifact.photos && artifact.photos.length > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="artifact-card-shell"
          className="fixed inset-0 z-50"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 1 }}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/90 backdrop-blur-sm"
          />

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 35, stiffness: 300 }}
            className="absolute inset-x-0 bottom-0 z-10 max-h-[85vh] overflow-hidden rounded-t-2xl bg-card border-t border-x border-border safe-bottom"
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-4 pb-3">
              <div className="w-8 h-0.5 rounded-full bg-border" />
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full border border-border hover:bg-secondary transition-colors z-10"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>

            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(85vh-50px)] px-6 pb-10">
              {/* Image area */}
              <div className="relative h-52 -mx-6 mb-8 overflow-hidden bg-secondary">
                {hasPhotos ? (
                  <img
                    src={artifact.photos[0]}
                    alt={artifact.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-3 rounded-full border border-border flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <p className="text-xs text-muted-foreground font-body tracking-wide">No image available</p>
                    </div>
                  </div>
                )}
                
                {/* Vignette on image */}
                <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />

                {/* Gold accent line */}
                <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
              </div>

              {/* Title */}
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-2xl md:text-3xl font-display text-foreground mb-5 leading-tight"
              >
                {artifact.name}
              </motion.h2>

              {/* Meta info */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex flex-wrap gap-3 mb-8"
              >
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border text-muted-foreground text-xs font-body tracking-wide">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  {artifact.date}
                </span>
                {artifact.photos.length > 1 && (
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border text-muted-foreground text-xs font-body tracking-wide">
                    <ImageIcon className="w-3.5 h-3.5 text-primary" />
                    {artifact.photos.length} photos
                  </span>
                )}
              </motion.div>

              {/* Divider */}
              <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-8" />

              {/* Description */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <h3 className="text-[10px] font-body font-medium text-muted-foreground uppercase tracking-[0.2em] mb-4">
                  Description
                </h3>
                <p className="text-sm font-body text-foreground/85 leading-relaxed whitespace-pre-line">
                  {artifact.description}
                </p>
              </motion.div>

              {/* Additional photos */}
              {artifact.photos.length > 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-8"
                >
                  <h3 className="text-[10px] font-body font-medium text-muted-foreground uppercase tracking-[0.2em] mb-4">
                    Gallery
                  </h3>
                  <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2">
                    {artifact.photos.slice(1).map((photo, index) => (
                      <img
                        key={index}
                        src={photo}
                        alt={`${artifact.name} - photo ${index + 2}`}
                        className="w-20 h-20 rounded-lg object-cover flex-shrink-0 border border-border"
                      />
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Decorative bottom element */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
                className="mt-10 pt-6 border-t border-border flex items-center justify-center gap-3"
              >
                <span className="w-10 h-px bg-primary/30" />
                <span className="text-[9px] font-body text-muted-foreground/50 tracking-[0.4em] uppercase">MOEB</span>
                <span className="w-10 h-px bg-primary/30" />
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ArtifactCard;
