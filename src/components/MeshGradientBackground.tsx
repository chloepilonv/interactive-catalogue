import { Canvas } from "@react-three/fiber";
import { ShaderPlane, EnergyRing } from "@/components/ui/background-paper-shaders";

interface MeshGradientBackgroundProps {
  className?: string;
}

const MeshGradientBackground = ({ className = "" }: MeshGradientBackgroundProps) => {
  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      {/* Three.js Canvas for shader effects */}
      <Canvas
        camera={{ position: [0, 0, 3], fov: 75 }}
        style={{ position: "absolute", inset: 0 }}
        gl={{ alpha: true, antialias: true }}
      >
        {/* Ambient lighting */}
        <ambientLight intensity={0.5} />
        
        {/* Shader planes with museum-themed colors */}
        <ShaderPlane position={[-1.5, 1, -2]} color1="#1a1614" color2="#c4a052" />
        <ShaderPlane position={[1.5, -0.5, -2.5]} color1="#2a2420" color2="#d4b062" />
        <ShaderPlane position={[0, 0.5, -3]} color1="#0f0d0c" color2="#b49042" />
        
        {/* Energy rings for visual interest */}
        <EnergyRing radius={1.5} position={[-1, 0.5, -1.5]} />
        <EnergyRing radius={1} position={[1.2, -0.3, -2]} />
        <EnergyRing radius={0.8} position={[0, -0.8, -1]} />
      </Canvas>
      
      {/* Dark overlay for text readability */}
      <div className="absolute inset-0 bg-background/80" />
    </div>
  );
};

export default MeshGradientBackground;
