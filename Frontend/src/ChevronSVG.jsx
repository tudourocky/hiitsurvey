import React from 'react';

const ChevronSVG = ({ size = 400, color = 'currentColor', direction = 'right' }) => {
  // Rotate the SVG container based on direction prop
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
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: rotation[direction], transition: 'transform 0.2s linear' }}
    >
      {/* Path for a right-pointing chevron */}
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
};

export default ChevronSVG;
