import React from 'react';

const ChevronSVG = ({ size = 24, color = 'currentColor', direction = 'right' }) => {
  // Rotate the SVG container based on direction prop
  // The base path is a right-pointing chevron: >
  const rotation = {
    right: '0deg',
    down: '90deg',
    left: '180deg',
    up: '270deg',
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ 
        transform: `rotate(${rotation[direction]})`, 
        transition: 'transform 0.2s linear',
        display: 'block'
      }}
    >
      {/* Path for a right-pointing chevron: > */}
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
};

export default ChevronSVG;
