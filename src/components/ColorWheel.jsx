import React, { useEffect, useRef, useState, useCallback } from 'react';
import { formatHex, oklch } from 'culori';

const ColorWheel = ({ selectedColor, onColorSelect, size = 400 }) => {
  const canvasRef = useRef(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState(null);
  const [isPulsing, setIsPulsing] = useState(false);
  const [rotation, setRotation] = useState(0);

  const SEGMENTS = 36; // 36 segments = 10° each
  const RINGS = 8; // Saturation rings

  // Draw the segmented color wheel
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const centerX = size / 2;
    const centerY = size / 2;
    const maxRadius = size / 2 - 20;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    // Draw segments
    for (let ring = 0; ring < RINGS; ring++) {
      const innerRadius = (ring / RINGS) * maxRadius;
      const outerRadius = ((ring + 1) / RINGS) * maxRadius;
      const saturation = ((ring + 1) / RINGS) * 0.25; // Max chroma 0.25

      for (let segment = 0; segment < SEGMENTS; segment++) {
        const hue = (segment / SEGMENTS) * 360;
        const startAngle = (segment / SEGMENTS) * 2 * Math.PI - Math.PI / 2;
        const endAngle = ((segment + 1) / SEGMENTS) * 2 * Math.PI - Math.PI / 2;

        // Create OKLCH color
        const color = oklch({ l: 0.65, c: saturation, h: hue });
        let hexColor;
        try {
          hexColor = formatHex(color) || '#888888';
        } catch {
          hexColor = '#888888';
        }

        // Check if this is the selected segment
        const isSelected = selectedSegment && 
          selectedSegment.ring === ring && 
          selectedSegment.segment === segment;

        // Draw segment
        ctx.beginPath();
        ctx.arc(centerX, centerY, innerRadius, startAngle, endAngle);
        ctx.arc(centerX, centerY, outerRadius, endAngle, startAngle, true);
        ctx.closePath();

        ctx.fillStyle = hexColor;
        ctx.fill();

        // Border
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = 0.5;
        ctx.stroke();

        // Highlight selected segment
        if (isSelected && isPulsing) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.lineWidth = 3;
          ctx.stroke();
        }
      }
    }

    // Center circle (black)
    ctx.beginPath();
    ctx.arc(centerX, centerY, maxRadius / RINGS, 0, 2 * Math.PI);
    ctx.fillStyle = '#000000';
    ctx.fill();

  }, [size, selectedSegment, isPulsing, SEGMENTS, RINGS]);

  // Handle click on wheel
  const handleClick = useCallback((e) => {
    if (isSpinning) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    const distance = Math.sqrt(x * x + y * y);
    const angle = Math.atan2(y, x) + Math.PI / 2;
    const normalizedAngle = (angle < 0 ? angle + 2 * Math.PI : angle);

    const maxRadius = size / 2 - 20;
    const ringSize = maxRadius / RINGS;

    // Determine which ring and segment was clicked
    const ring = Math.floor(distance / ringSize);
    const segment = Math.floor((normalizedAngle / (2 * Math.PI)) * SEGMENTS);

    if (ring >= 0 && ring < RINGS && segment >= 0 && segment < SEGMENTS) {
      const hue = (segment / SEGMENTS) * 360;
      const saturation = ((ring + 1) / RINGS) * 0.25;

      // Create color
      const color = { mode: 'oklch', l: 0.65, c: saturation, h: hue };

      // Select segment and trigger animations
      setSelectedSegment({ ring, segment });
      setIsPulsing(true);
      
      // Stop pulsing after 3 seconds
      setTimeout(() => setIsPulsing(false), 3000);

      // Notify parent
      if (onColorSelect) onColorSelect(color);
    }
  }, [size, isSpinning, onColorSelect, SEGMENTS, RINGS]);

  // Trigger spin animation
  const spinWheel = useCallback(() => {
    if (isSpinning) return;
    
    setIsSpinning(true);
    setRotation(prev => prev + 1800 + Math.random() * 360); // 5+ full rotations
    
    setTimeout(() => {
      setIsSpinning(false);
      // Randomly select a segment after spin
      const randomRing = Math.floor(Math.random() * RINGS);
      const randomSegment = Math.floor(Math.random() * SEGMENTS);
      const hue = (randomSegment / SEGMENTS) * 360;
      const saturation = ((randomRing + 1) / RINGS) * 0.25;
      const color = { mode: 'oklch', l: 0.65, c: saturation, h: hue };
      
      setSelectedSegment({ ring: randomRing, segment: randomSegment });
      setIsPulsing(true);
      setTimeout(() => setIsPulsing(false), 3000);
      
      if (onColorSelect) onColorSelect(color);
    }, 3000);
  }, [isSpinning, onColorSelect, SEGMENTS, RINGS]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          onClick={handleClick}
          className="cursor-pointer rounded-full"
          style={{
            filter: 'drop-shadow(0 10px 25px rgba(0, 0, 0, 0.5))',
            transform: `rotate(${rotation}deg)`,
            transition: isSpinning ? 'transform 3s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none',
            animation: isPulsing ? 'pulse-grow 1.5s ease-in-out infinite' : 'none'
          }}
        />
        
        {/* Center label */}
        <div 
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{
            transform: `translate(-50%, -50%) rotate(-${rotation}deg)`,
            transition: isSpinning ? 'transform 3s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none'
          }}
        >
          <div className="text-white text-center font-bold">
            <div className="text-xs opacity-70">hex&hue</div>
          </div>
        </div>
      </div>

      <button
        onClick={spinWheel}
        disabled={isSpinning}
        className="px-6 py-2 bg-[#ff6b4a] hover:bg-[#ff6b4a]/80 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSpinning ? 'Spinning...' : '🎡 Spin the Wheel'}
      </button>

      <style>{`
        @keyframes pulse-grow {
          0%, 100% { transform: rotate(${rotation}deg) scale(1); }
          50% { transform: rotate(${rotation}deg) scale(1.03); }
        }
      `}</style>
    </div>
  );
};

export default ColorWheel;