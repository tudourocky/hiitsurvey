import React from 'react';

// Pixel art alien - Space Invaders style
export const PixelAlien = ({ size = 40, className = '' }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 16 16" 
    className={className}
    style={{ imageRendering: 'pixelated' }}
  >
    {/* Background - darker purple */}
    <rect x="0" y="0" width="16" height="16" fill="#321650" />
    
    {/* Left antenna/ear - extending upward and outward */}
    <rect x="1" y="1" width="1" height="1" fill="#8A4AF4" />
    <rect x="2" y="2" width="1" height="1" fill="#8A4AF4" />
    
    {/* Right antenna/ear - extending upward and outward */}
    <rect x="14" y="1" width="1" height="1" fill="#8A4AF4" />
    <rect x="13" y="2" width="1" height="1" fill="#8A4AF4" />
    
    {/* Main body - central rectangular part */}
    <rect x="2" y="3" width="12" height="6" fill="#8A4AF4" />
    <rect x="3" y="4" width="10" height="4" fill="#8A4AF4" />
    
    {/* Eyes - dark pixels (background color) for the two eyes */}
    <rect x="5" y="5" width="1" height="1" fill="#321650" />
    <rect x="10" y="5" width="1" height="1" fill="#321650" />
    
    {/* Six legs/tentacles arranged symmetrically below */}
    {/* Far left leg */}
    <rect x="1" y="9" width="1" height="2" fill="#8A4AF4" />
    <rect x="0" y="10" width="1" height="1" fill="#8A4AF4" />
    
    {/* Left-middle leg */}
    <rect x="3" y="9" width="1" height="2" fill="#8A4AF4" />
    <rect x="2" y="10" width="1" height="1" fill="#8A4AF4" />
    
    {/* Left-center leg */}
    <rect x="5" y="9" width="1" height="2" fill="#8A4AF4" />
    <rect x="4" y="10" width="1" height="1" fill="#8A4AF4" />
    
    {/* Right-center leg */}
    <rect x="10" y="9" width="1" height="2" fill="#8A4AF4" />
    <rect x="11" y="10" width="1" height="1" fill="#8A4AF4" />
    
    {/* Right-middle leg */}
    <rect x="12" y="9" width="1" height="2" fill="#8A4AF4" />
    <rect x="13" y="10" width="1" height="1" fill="#8A4AF4" />
    
    {/* Far right leg */}
    <rect x="14" y="9" width="1" height="2" fill="#8A4AF4" />
    <rect x="15" y="10" width="1" height="1" fill="#8A4AF4" />
  </svg>
);

export default PixelAlien;
