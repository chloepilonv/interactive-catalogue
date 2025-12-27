interface MeshGradientBackgroundProps {
  className?: string;
}

const MeshGradientBackground = ({ className = "" }: MeshGradientBackgroundProps) => {
  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      {/* Animated gradient orbs */}
      <div className="absolute inset-0">
        <div 
          className="absolute w-[600px] h-[600px] rounded-full opacity-30 blur-[120px] animate-float-slow"
          style={{
            background: "radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)",
            top: "-20%",
            left: "-10%",
          }}
        />
        <div 
          className="absolute w-[500px] h-[500px] rounded-full opacity-20 blur-[100px] animate-float-medium"
          style={{
            background: "radial-gradient(circle, hsl(220 60% 30%) 0%, transparent 70%)",
            bottom: "-15%",
            right: "-10%",
          }}
        />
        <div 
          className="absolute w-[400px] h-[400px] rounded-full opacity-25 blur-[80px] animate-float-fast"
          style={{
            background: "radial-gradient(circle, hsl(280 50% 25%) 0%, transparent 70%)",
            top: "40%",
            left: "50%",
            transform: "translateX(-50%)",
          }}
        />
      </div>
      
      {/* Dark overlay for text readability */}
      <div className="absolute inset-0 bg-background/70" />
    </div>
  );
};

export default MeshGradientBackground;
