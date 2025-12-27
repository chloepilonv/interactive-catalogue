import { MeshGradient } from "@paper-design/shaders-react";

interface MeshGradientBackgroundProps {
  className?: string;
}

const MeshGradientBackground = ({ className = "" }: MeshGradientBackgroundProps) => {
  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      <MeshGradient
        color1="#1a1a2e"
        color2="#16213e"
        color3="#0f3460"
        color4="#e94560"
        speed={0.15}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
        }}
      />
      {/* Dark overlay for better text readability */}
      <div className="absolute inset-0 bg-background/60" />
    </div>
  );
};

export default MeshGradientBackground;
