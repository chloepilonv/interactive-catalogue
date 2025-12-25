import { useEffect } from "react";
import Header from "@/components/Header";
import CameraView from "@/components/CameraView";

const Index = () => {
  // Lock to portrait mode hint for mobile
  useEffect(() => {
    // Prevent zoom on double tap
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    
    return () => {
      document.removeEventListener('gesturestart', (e) => e.preventDefault());
    };
  }, []);

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden bg-charcoal-deep">
      {/* Header overlay */}
      <Header />

      {/* Camera view takes full screen */}
      <CameraView />

      {/* App info - hidden but good for SEO */}
      <h1 className="sr-only">
        Musée des Ondes Emile Berliner - Interactive Collection Viewer
      </h1>
    </main>
  );
};

export default Index;
