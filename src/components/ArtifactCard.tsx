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
          className="fixed inset-0 z-40"
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
            className="absolute inset-0 bg-charcoal-deep/80 backdrop-blur-sm"
          />

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="absolute inset-x-0 bottom-0 z-10 max-h-[85vh] overflow-hidden rounded-t-3xl bg-gradient-card border-t border-x border-border shadow-card safe-bottom"
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors z-10"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-foreground" />
            </button>

            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(85vh-40px)] px-6 pb-8">
              {/* Image area */}
              <div className="relative h-48 -mx-6 mb-6 overflow-hidden bg-gradient-vintage">
                {hasPhotos ? (
                  <img
                    src={artifact.photos[0]}
                    alt={artifact.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback if image fails to load
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-secondary/50 flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground font-body">No image</p>
                    </div>
                  </div>
                )}
                <div className="absolute inset-0 bg-vintage-vignette" />

                {/* Gold accent line */}
                <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-gold" />
              </div>

              {/* Title */}
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-2xl md:text-3xl font-display font-semibold text-foreground mb-4"
              >
                {artifact.name}
              </motion.h2>

              {/* Meta info */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex flex-wrap gap-3 mb-6"
              >
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm font-body">
                  <Calendar className="w-4 h-4 text-primary" />
                  {artifact.date}
                </span>
                {artifact.photos.length > 1 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm font-body">
                    <ImageIcon className="w-4 h-4 text-primary" />
                    {artifact.photos.length} photos
                  </span>
                )}
              </motion.div>

              {/* Divider */}
              <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-6" />

              {/* Description */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <h3 className="text-sm font-body font-medium text-muted-foreground uppercase tracking-wider mb-3">
                  Description
                </h3>
                <p className="text-base font-body text-foreground/90 leading-relaxed whitespace-pre-line">
                  {artifact.description}
                </p>
              </motion.div>

              {/* Additional photos */}
              {artifact.photos.length > 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-6"
                >
                  <h3 className="text-sm font-body font-medium text-muted-foreground uppercase tracking-wider mb-3">
                    More Photos
                  </h3>
                  <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2">
                    {artifact.photos.slice(1).map((photo, index) => (
                      <img
                        key={index}
                        src={photo}
                        alt={`${artifact.name} - photo ${index + 2}`}
                        className="w-24 h-24 rounded-lg object-cover flex-shrink-0 border border-border"
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
                className="mt-8 pt-6 border-t border-border flex items-center justify-center gap-2 text-muted-foreground"
              >
                <span className="w-8 h-px bg-primary/50" />
                <span className="text-xs font-body uppercase tracking-widest">MOEB</span>
                <span className="w-8 h-px bg-primary/50" />
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ArtifactCard;
