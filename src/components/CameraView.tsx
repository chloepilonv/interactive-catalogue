import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, AlertCircle, RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import DetectionMarker from "./DetectionMarker";
import ArtifactCard from "./ArtifactCard";
import { useArtifacts, Artifact } from "@/hooks/useArtifacts";
import { supabase } from "@/integrations/supabase/client";

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

  const { toast } = useToast();

  // Fetch artifacts from database
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
        if (e?.name === "OverconstrainedError" || e?.name === "NotFoundError") {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        } else {
          throw e;
        }
      }

      streamRef.current = stream;

      if (videoRef.current) {
        const videoEl = videoRef.current;
        videoEl.muted = true;
        videoEl.playsInline = true;
        videoEl.srcObject = stream;

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

  useEffect(() => {
    void startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const captureAndAnalyze = async () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) {
      toast({ title: "Camera not ready", description: "Please wait for the camera to initialize.", variant: "destructive" });
      return;
    }

    setIsScanning(true);
    setDetections([]);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not get canvas context");
      ctx.drawImage(video, 0, 0);
      
      const imageDataUrl = canvas.toDataURL("image/jpeg", 0.8);

      const { data, error } = await supabase.functions.invoke("analyze-artifact", {
        body: { imageUrl: imageDataUrl }
      });

      if (error) throw error;

      // Only use a registry photo when the backend explicitly confirmed a database match
      const artifactPhotos =
        data?.fromDatabase && Array.isArray(data?.photos) && data.photos.length > 0 ? data.photos : [imageDataUrl];
      
      const detectedArtifact: Artifact = {
        id: data.id || `detected-${Date.now()}`,
        name: data.name || "Unknown Artifact",
        date: data.date || "Unknown date",
        description: data.description || "No description available.",
        photos: artifactPhotos
      };

      setDetections([{
        id: `detection-${Date.now()}`,
        x: 50,
        y: 50,
        artifact: detectedArtifact
      }]);

      const toastMessage = data.fromDatabase 
        ? `Found in collection: ${detectedArtifact.name}` 
        : detectedArtifact.name;
      toast({ title: "Object identified!", description: toastMessage });
    } catch (err: any) {
      console.error("Analysis error:", err);
      toast({
        title: "Analysis failed",
        description: err?.message || "Could not analyze the image. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsScanning(false);
    }
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
    <div className="relative w-full h-full bg-background overflow-hidden">
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Film grain overlay */}
      <div className="absolute inset-0 texture-grain pointer-events-none z-10" />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background z-30">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
            className="w-10 h-10 border border-primary/40 border-t-primary rounded-full mb-6"
          />
          <p className="text-muted-foreground font-body text-sm tracking-widest uppercase">
            Initializing camera...
          </p>
        </div>
      )}

      {/* Error overlay */}
      {!isLoading && cameraError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background px-8 text-center z-30">
          <div className="w-14 h-14 rounded-full border border-border flex items-center justify-center mb-6">
            <AlertCircle className="w-6 h-6 text-primary" />
          </div>

          <p className="text-foreground font-body text-sm mb-2">{cameraError}</p>
          {cameraErrorDetail && (
            <p className="text-xs text-muted-foreground font-body mb-6">{cameraErrorDetail}</p>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              type="button"
              onClick={startCamera}
              className="bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 font-body"
            >
              Try again
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => window.open(window.location.href, "_blank", "noopener,noreferrer")}
              className="text-muted-foreground hover:text-foreground font-body"
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
            className="absolute inset-0 pointer-events-none z-20"
          >
            {/* Scanning line */}
            <motion.div
              initial={{ top: "0%" }}
              animate={{ top: "100%" }}
              transition={{ duration: 2, ease: "linear" }}
              className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent"
            />
            
            {/* Corner brackets */}
            <div className="absolute inset-12 md:inset-24">
              <div className="absolute top-0 left-0 w-12 h-12 border-t border-l border-primary/60" />
              <div className="absolute top-0 right-0 w-12 h-12 border-t border-r border-primary/60" />
              <div className="absolute bottom-0 left-0 w-12 h-12 border-b border-l border-primary/60" />
              <div className="absolute bottom-0 right-0 w-12 h-12 border-b border-r border-primary/60" />
            </div>

            {/* Center text */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <motion.p
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-primary font-body text-xs uppercase tracking-[0.3em]"
              >
                Analyzing
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
      <div className="absolute inset-0 bg-vintage-vignette pointer-events-none z-10" />

      {/* Top gradient */}
      <div className="absolute top-0 inset-x-0 h-28 bg-gradient-to-b from-background/80 to-transparent pointer-events-none z-10" />

      {/* Bottom gradient */}
      <div className="absolute bottom-0 inset-x-0 h-48 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none z-10" />


      {/* Scan button - centered container */}
      <div className="absolute bottom-10 inset-x-0 flex justify-center z-30 safe-bottom">
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={captureAndAnalyze}
          disabled={isScanning}
          className="flex items-center gap-3 px-8 py-4 rounded-full bg-primary/10 border border-primary/40 backdrop-blur-md text-primary font-body font-medium text-sm tracking-wide disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:bg-primary/15 hover:border-primary/60"
        >
          {isScanning ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                className="w-4 h-4 border border-primary/40 border-t-primary rounded-full"
              />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <Camera className="w-4 h-4" />
              <span>Scan Object</span>
            </>
          )}
        </motion.button>
      </div>

      {/* Instructions hint */}
      <AnimatePresence>
        {!isScanning && detections.length === 0 && !isLoading && !cameraError && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.8 }}
            className="absolute bottom-28 inset-x-0 text-center text-xs text-muted-foreground font-body z-20 tracking-wide px-4"
          >
            Point your camera at a museum artifact
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
