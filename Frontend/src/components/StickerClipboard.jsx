import React, { useState, useRef } from 'react';
import './StickerClipboard.css';
import { useReward } from '../contexts/RewardContext';

const STICKERS = [
  { id: 'joystick', name: 'Arcade Joystick', threshold: 100, glowColor: '#00ffff' },
  { id: 'insert-coin', name: 'Insert Coin Sign', threshold: 300, glowColor: '#ff0000' },
  { id: 'circle-blue', name: 'Blue Circle', threshold: 500, glowColor: '#00ffff' },
  { id: 'circle-yellow', name: 'Yellow Circle', threshold: 700, glowColor: '#ffff00' },
  { id: 'circle-green', name: 'Green Circle', threshold: 900, glowColor: '#00ff00' },
  { id: 'star', name: 'Golden Star', threshold: 1200, glowColor: '#ffff00' },
  { id: 'mixtape-1', name: 'Mix Tape', threshold: 1500, glowColor: '#00ffff' },
  { id: 'game-over', name: 'Game Over', threshold: 2000, glowColor: '#ff00ff' },
  { id: 'shades', name: 'Shutter Shades', threshold: 2500, glowColor: '#ff00ff' },
  { id: 'mixtape-2', name: 'Mix Tape', threshold: 3000, glowColor: '#00ffff' },
];

const StickerClipboard = () => {
  const { points, setPoints } = useReward();
  const [placedStickers, setPlacedStickers] = useState(() => {
    const saved = localStorage.getItem('placed_stickers');
    return saved ? JSON.parse(saved) : [];
  });

  const unlockedStickers = STICKERS.filter(sticker => points >= sticker.threshold);
  const availableStickers = unlockedStickers.filter(
    sticker => !placedStickers.some(placed => placed.id === sticker.id)
  );

  const handlePlaceSticker = (sticker) => {
    const newPlacement = {
      id: sticker.id,
      x: Math.random() * 60 + 10, // Random position between 10% and 70%
      y: Math.random() * 60 + 10,
      rotation: (Math.random() - 0.5) * 20, // Random rotation -10 to +10 degrees
    };
    const updated = [...placedStickers, newPlacement];
    setPlacedStickers(updated);
    localStorage.setItem('placed_stickers', JSON.stringify(updated));
  };

  const handleRemoveSticker = (stickerId, e) => {
    e.stopPropagation();
    const updated = placedStickers.filter(s => s.id !== stickerId);
    setPlacedStickers(updated);
    localStorage.setItem('placed_stickers', JSON.stringify(updated));
  };

  const [draggingId, setDraggingId] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragStart = (e, stickerId) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', stickerId);
    setDraggingId(stickerId);
    e.currentTarget.style.opacity = '0.6';
    e.currentTarget.style.cursor = 'grabbing';
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
    e.currentTarget.style.cursor = 'grab';
    setDraggingId(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const stickerId = e.dataTransfer.getData('text/plain');
    const stickerArea = e.currentTarget;
    const rect = stickerArea.getBoundingClientRect();
    
    // Calculate position relative to sticker area
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    const updated = placedStickers.map(sticker => {
      if (sticker.id === stickerId) {
        return {
          ...sticker,
          x: Math.max(0, Math.min(90, x)),
          y: Math.max(0, Math.min(90, y))
          // rotation is preserved
        };
      }
      return sticker;
    });
    
    setPlacedStickers(updated);
    localStorage.setItem('placed_stickers', JSON.stringify(updated));
  };

  const handleClearAll = () => {
    setPlacedStickers([]);
    localStorage.setItem('placed_stickers', JSON.stringify([]));
  };

  return (
    <div className="clipboard-container">
      <div className="clipboard-header">
        <h2 className="neon-text-pink">STICKER COLLECTION</h2>
        <div className="score-display">
          <span className="label">SCORE:</span>
          <span className="value neon-text-blue">{points.toString().padStart(6, '0')}</span>
        </div>
      </div>

      {/* Test Controls */}
      <div className="test-controls">
        <button onClick={() => setPoints(0)} className="test-btn">RESET</button>
        <button onClick={() => setPoints(p => p + 100)} className="test-btn">+100</button>
        <button onClick={() => setPoints(500)} className="test-btn">500</button>
        <button onClick={() => setPoints(1000)} className="test-btn">1K</button>
        <button onClick={() => setPoints(2000)} className="test-btn">2K</button>
        <button onClick={() => setPoints(5000)} className="test-btn">5K</button>
      </div>

      <div className="clipboard-layout">
        {/* Clipboard Surface */}
        <div className="clipboard-wrapper">
          <div className="clipboard-clip"></div>
          <div className="clipboard-surface arcade-frame neon-border-blue">
            <div className="clipboard-title">MY STICKERS</div>
            <div 
              className={`sticker-area ${isDragOver ? 'drag-over' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => {
                handleDrop(e);
                setIsDragOver(false);
              }}
            >
              {placedStickers.map(placement => {
                const sticker = STICKERS.find(s => s.id === placement.id);
                return (
                  <div
                    key={placement.id}
                    className={`sticker placed ${placement.id} ${draggingId === placement.id ? 'dragging' : ''}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, placement.id)}
                    onDragEnd={handleDragEnd}
                    style={{
                      left: `${placement.x}%`,
                      top: `${placement.y}%`,
                      transform: `rotate(${placement.rotation}deg)`,
                      '--glow-color': sticker?.glowColor || '#00ffff'
                    }}
                    onContextMenu={(e) => handleRemoveSticker(placement.id, e)}
                    title="Drag to move, Right-click to remove"
                  >
                    <StickerContent stickerId={placement.id} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Available Stickers Panel */}
        <div className="stickers-panel arcade-frame neon-border-pink">
          <h3 className="neon-text-blue">AVAILABLE STICKERS</h3>
          <div className="stickers-grid">
            {STICKERS.map(sticker => {
              const isUnlocked = points >= sticker.threshold;
              const isPlaced = placedStickers.some(p => p.id === sticker.id);
              return (
                <div
                  key={sticker.id}
                  className={`sticker-item ${isUnlocked ? 'unlocked' : 'locked'} ${isPlaced ? 'placed' : ''}`}
                >
                  <div
                    className={`sticker preview ${sticker.id}`}
                    style={{ '--glow-color': sticker.glowColor }}
                  >
                    <StickerContent stickerId={sticker.id} />
                  </div>
                  <div className="sticker-info">
                    <div className="sticker-name">{sticker.name}</div>
                    <div className="sticker-threshold">{sticker.threshold} PTS</div>
                    {isUnlocked && !isPlaced && (
                      <button
                        className="place-btn"
                        onClick={() => handlePlaceSticker(sticker)}
                      >
                        PLACE
                      </button>
                    )}
                    {isPlaced && (
                      <div className="placed-badge">PLACED</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {placedStickers.length > 0 && (
            <button className="clear-btn" onClick={handleClearAll}>
              CLEAR ALL
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Sticker Content Component
const StickerContent = ({ stickerId }) => {
  switch (stickerId) {
    case 'joystick':
      return <JoystickSticker />;
    case 'insert-coin':
      return <InsertCoinSticker />;
    case 'circle-blue':
      return <CircleSticker color="#0066ff" />;
    case 'circle-yellow':
      return <CircleSticker color="#ffcc00" />;
    case 'circle-green':
      return <CircleSticker color="#00ff00" />;
    case 'star':
      return <StarSticker />;
    case 'mixtape-1':
    case 'mixtape-2':
      return <MixtapeSticker />;
    case 'game-over':
      return <GameOverSticker />;
    case 'shades':
      return <ShadesSticker />;
    default:
      return null;
  }
};

const JoystickSticker = () => (
  <div className="joystick-sticker">
    <div className="joystick-base"></div>
    <div className="joystick-shaft"></div>
    <div className="joystick-ball"></div>
    <div className="joystick-btn btn-1"></div>
    <div className="joystick-btn btn-2"></div>
  </div>
);

const InsertCoinSticker = () => (
  <div className="insert-coin-sticker">
    <div className="coin-text">INSERT COIN</div>
    <div className="coin-amount">25¢</div>
    <div className="coin-arrow">↓</div>
  </div>
);

const CircleSticker = ({ color }) => (
  <div className="circle-sticker" style={{ backgroundColor: color }}></div>
);

const StarSticker = () => (
  <div className="star-sticker">
    <div className="star-shape">★</div>
  </div>
);

const MixtapeSticker = () => (
  <div className="mixtape-sticker">
    <div className="tape-label">A MIX TAPE</div>
    <div className="tape-stripe"></div>
    <div className="tape-spool spool-1"></div>
    <div className="tape-spool spool-2"></div>
  </div>
);

const GameOverSticker = () => (
  <div className="game-over-sticker">
    <div className="game-text">GAME</div>
    <div className="over-text">OVER</div>
  </div>
);

const ShadesSticker = () => (
  <div className="shades-sticker">
    <div className="shades-frame"></div>
    <div className="shades-lens lens-1">
      <div className="shutter-line"></div>
      <div className="shutter-line"></div>
      <div className="shutter-line"></div>
    </div>
    <div className="shades-lens lens-2">
      <div className="shutter-line"></div>
      <div className="shutter-line"></div>
      <div className="shutter-line"></div>
    </div>
  </div>
);

export default StickerClipboard;
