import React from 'react';

// Pixel art ghost - cute friendly ghost
export const PixelGhost = ({ size = 40, className = '' }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 16 16" 
    className={className}
    style={{ imageRendering: 'pixelated' }}
  >
    {/* Transparent background - will show through to page background */}
    
    {/* Main ghost body - white */}
    {/* Top rounded section */}
    <rect x="4" y="1" width="8" height="1" fill="#FFFFFF" />
    <rect x="3" y="2" width="10" height="1" fill="#FFFFFF" />
    <rect x="2" y="3" width="12" height="7" fill="#FFFFFF" />
    
    {/* Arm stubs - extending slightly outward */}
    <rect x="1" y="4" width="1" height="3" fill="#FFFFFF" />
    <rect x="14" y="4" width="1" height="3" fill="#FFFFFF" />
    
    {/* Subtle outline/shadow - light blue/purple around edges */}
    <rect x="1" y="4" width="1" height="1" fill="#C0D8E8" opacity="0.4" />
    <rect x="14" y="4" width="1" height="1" fill="#C0D8E8" opacity="0.4" />
    
    {/* Wavy bottom - three prominent undulations */}
    {/* Left undulation (dip) */}
    <rect x="2" y="10" width="2" height="1" fill="#FFFFFF" />
    <rect x="3" y="11" width="1" height="1" fill="#FFFFFF" />
    <rect x="2" y="11" width="1" height="1" fill="#C0D8E8" opacity="0.3" />
    
    {/* Middle undulation (dip) */}
    <rect x="5" y="10" width="2" height="1" fill="#FFFFFF" />
    <rect x="6" y="11" width="1" height="1" fill="#FFFFFF" />
    <rect x="5" y="11" width="1" height="1" fill="#C0D8E8" opacity="0.3" />
    
    {/* Right undulation (dip) */}
    <rect x="9" y="10" width="2" height="1" fill="#FFFFFF" />
    <rect x="10" y="11" width="1" height="1" fill="#FFFFFF" />
    <rect x="9" y="11" width="1" height="1" fill="#C0D8E8" opacity="0.3" />
    
    {/* Right side bottom */}
    <rect x="12" y="10" width="2" height="1" fill="#FFFFFF" />
    <rect x="12" y="11" width="1" height="1" fill="#FFFFFF" />
    
    {/* Eyes - black square pixels */}
    <rect x="5" y="4" width="1" height="1" fill="#000000" />
    <rect x="10" y="4" width="1" height="1" fill="#000000" />
    
    {/* Cheeks - pink square pixels, below and to outer side of eyes */}
    <rect x="3" y="6" width="1" height="1" fill="#FFC0CB" />
    <rect x="12" y="6" width="1" height="1" fill="#FFC0CB" />
    
    {/* Mouth - black horizontal pixel, centered below eyes */}
    <rect x="7" y="7" width="2" height="1" fill="#000000" />
    
    {/* Light pink shadow beneath ghost */}
    <rect x="2" y="12" width="12" height="1" fill="#F7DED7" opacity="0.6" />
  </svg>
);

export default PixelGhost;
