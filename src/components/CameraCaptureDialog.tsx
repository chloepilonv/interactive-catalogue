import { useEffect, useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type CameraCaptureDialogProps = {
  onCapture: (file: File) => Promise<void> | void;
  disabled?: boolean;
};

export function CameraCaptureDialog({ onCapture, disabled }: CameraCaptureDialogProps) {
  const [open, setOpen] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const stop = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };

    if (!open) {
      stop();
      setCameraError(null);
      setIsStarting(false);
      return;
    }

    const start = async () => {
      setIsStarting(true);
      setCameraError(null);

      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Camera not supported on this device/browser.");
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });

        streamRef.current = stream;

        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      } catch (e) {
        console.error("Camera capture error:", e);
        setCameraError("Unable to access camera. Please allow camera permissions.");
      } finally {
        setIsStarting(false);
      }
    };

    start();

    return () => {
      stop();
    };
  }, [open]);

  const handleCapture = async () => {
    const video = videoRef.current;
    if (!video) return;

    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      toast.error("Could not capture photo");
      return;
    }

    ctx.drawImage(video, 0, 0, w, h);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("toBlob returned null"))),
        "image/jpeg",
        0.9,
      );
    });

    const file = new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" });

    try {
      await onCapture(file);
      setOpen(false);
    } catch (e) {
      console.error("Capture upload error:", e);
      toast.error("Could not use captured photo");
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        <Camera className="mr-2 h-4 w-4" />
        Take photo
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Take a photo</DialogTitle>
            <DialogDescription>
              Allow camera access, then tap Capture.
            </DialogDescription>
          </DialogHeader>

          <div className="relative aspect-video w-full overflow-hidden rounded-md bg-muted">
            {cameraError ? (
              <div className="flex h-full w-full items-center justify-center p-4 text-center text-sm text-muted-foreground">
                {cameraError}
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                />

                {isStarting && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCapture}
              disabled={!!cameraError || isStarting}
            >
              Capture
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
