import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, AlertCircle, Scan, RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import DetectionMarker from "./DetectionMarker";
import ArtifactCard from "./ArtifactCard";
import { useArtifacts, Artifact } from "@/hooks/useArtifacts";

interface Detection {
  id: string;
  x: number;
  y: number;
  artifact: Artifact;
}

const CameraView = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraErrorDetail, setCameraErrorDetail] = useState<string | null>(null);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
  const [isCardOpen, setIsCardOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const isEmbedded = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const watchdogRef = useRef<number | null>(null);

  // Fetch artifacts from Google Sheets
  const { data: artifacts = [], isLoading: isLoadingArtifacts, refetch } = useArtifacts();

  const stopCamera = useCallback(() => {
    if (watchdogRef.current) {
      window.clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setIsLoading(true);
    setCameraError(null);
    setCameraErrorDetail(null);
    stopCamera();

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera not supported on this device/browser.");
      }

      const preferredConstraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(preferredConstraints);
      } catch (e: any) {
        // Some browsers/devices fail when asking for the environment camera; fallback to any camera.
        if (e?.name === "OverconstrainedError" || e?.name === "NotFoundError") {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        } else {
          throw e;
        }
      }

      streamRef.current = stream;

      if (videoRef.current) {
        const videoEl = videoRef.current;

        // Set these BEFORE assigning srcObject (matches working console test)
        videoEl.muted = true;
        videoEl.playsInline = true;
        videoEl.srcObject = stream;

        // Wait for loadedmetadata (like the working console script)
        await new Promise<void>((resolve) => {
          videoEl.onloadedmetadata = () => resolve();
        });

        await videoEl.play();
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error("Camera error:", error);

      const name = typeof error?.name === "string" ? error.name : undefined;
      const message = typeof error?.message === "string" ? error.message : undefined;

      let friendly = "Unable to access camera.";
      if (name === "NotAllowedError") friendly = "Camera access was blocked. Please allow camera permissions for this site.";
      else if (name === "NotFoundError") friendly = "No camera device was found.";
      else if (name === "NotReadableError") friendly = "Camera is already in use by another app or tab.";
      else if (name === "SecurityError") friendly = "Camera access is blocked by browser security settings.";
      else if (name === "OverconstrainedError") friendly = "This device can't use the requested camera settings.";

      setCameraError(friendly);
      setCameraErrorDetail([name, message].filter(Boolean).join(": ") || null);
      setIsLoading(false);
    }
  }, [stopCamera]);

  // Initialize camera
  useEffect(() => {
    void startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  // Simulate object detection
  const simulateDetection = () => {
    if (artifacts.length === 0) return;
    
    setIsScanning(true);
    setDetections([]);

    setTimeout(() => {
      // Generate 1-3 random detections from available artifacts
      const numDetections = Math.min(Math.floor(Math.random() * 3) + 1, artifacts.length);
      const shuffled = [...artifacts].sort(() => Math.random() - 0.5);
      const newDetections: Detection[] = [];

      for (let i = 0; i < numDetections; i++) {
        newDetections.push({
          id: `detection-${Date.now()}-${i}`,
          x: 20 + Math.random() * 60,
          y: 20 + Math.random() * 60,
          artifact: shuffled[i]
        });
      }

      setDetections(newDetections);
      setIsScanning(false);
    }, 1500);
  };

  const handleMarkerClick = (artifact: Artifact) => {
    setSelectedArtifact(artifact);
    setIsCardOpen(true);
  };

  const handleCloseCard = () => {
    setIsCardOpen(false);
    setTimeout(() => setSelectedArtifact(null), 300);
  };

  const handleRefresh = () => {
    refetch();
    setDetections([]);
  };

  return (
    <div className="relative w-full h-full bg-charcoal-deep overflow-hidden">
      {/* Always keep video mounted */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-dark z-20">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full"
          />
        </div>
      )}

      {/* Error overlay */}
      {!isLoading && cameraError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-dark px-6 text-center z-20">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-primary" />
          </div>

          <p className="text-foreground font-body">{cameraError}</p>
          {cameraErrorDetail && (
            <p className="mt-1 text-xs text-muted-foreground font-body">{cameraErrorDetail}</p>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Button
              type="button"
              onClick={startCamera}
              className="bg-gradient-gold text-primary-foreground shadow-gold"
            >
              Try again
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => window.open(window.location.href, "_blank", "noopener,noreferrer")}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Open in new tab
            </Button>
          </div>
        </div>
      )}

      {/* Scanning overlay effect */}
      <AnimatePresence>
        {isScanning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none z-10"
          >
            <motion.div
              initial={{ top: "0%" }}
              animate={{ top: "100%" }}
              transition={{ duration: 1.5, ease: "linear" }}
              className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent shadow-gold"
            />
            
            <div className="absolute inset-8 border-2 border-primary/30 rounded-lg">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary rounded-br-lg" />
            </div>

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <motion.p
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-primary font-body text-sm uppercase tracking-widest"
              >
                Scanning...
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detection markers */}
      <AnimatePresence>
        {detections.map((detection) => (
          <DetectionMarker
            key={detection.id}
            x={detection.x}
            y={detection.y}
            artifactName={detection.artifact.name}
            onClick={() => handleMarkerClick(detection.artifact)}
          />
        ))}
      </AnimatePresence>

      {/* Vignette overlay */}
      <div className="absolute inset-0 bg-vintage-vignette pointer-events-none z-5" />

      {/* Top gradient for header readability */}
      <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-charcoal-deep/70 to-transparent pointer-events-none" />

      {/* Bottom gradient for controls */}
      <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-charcoal-deep/90 to-transparent pointer-events-none" />

      {/* Collection info badge */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-20 left-4 z-30"
      >
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/80 backdrop-blur-sm border border-border/50">
          <span className="text-xs font-body text-muted-foreground">
            {isLoadingArtifacts ? 'Loading...' : `${artifacts.length} artifacts`}
          </span>
          <button
            onClick={handleRefresh}
            className="p-1 hover:bg-secondary rounded-full transition-colors"
            aria-label="Refresh collection"
          >
            <RefreshCw className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>
      </motion.div>

      {/* Scan button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={simulateDetection}
        disabled={isScanning || artifacts.length === 0}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-gold text-primary-foreground font-body font-medium shadow-gold disabled:opacity-50 disabled:cursor-not-allowed safe-bottom"
      >
        {isScanning ? (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Scan className="w-5 h-5" />
            </motion.div>
            Scanning...
          </>
        ) : (
          <>
            <Camera className="w-5 h-5" />
            Scan Object
          </>
        )}
      </motion.button>

      {/* Instructions hint */}
      <AnimatePresence>
        {!isScanning && detections.length === 0 && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 text-center text-sm text-foreground/70 font-body z-20 max-w-[280px]"
          >
            {artifacts.length === 0 
              ? "No artifacts in collection. Add items to your Google Sheet."
              : "Point camera at a museum object and tap Scan"
            }
          </motion.p>
        )}
      </AnimatePresence>

      {/* Artifact detail card */}
      <ArtifactCard
        artifact={selectedArtifact}
        isOpen={isCardOpen}
        onClose={handleCloseCard}
      />
    </div>
  );
};

export default CameraView;
