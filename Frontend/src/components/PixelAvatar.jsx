import React from 'react';
import './PixelAvatar.css';
import { useReward } from '../contexts/RewardContext';

const ACCESSORIES = [
  { id: 'sunglasses', name: 'Cool Sunglasses', threshold: 500, emoji: '🕶️' },
  { id: 'crown', name: 'Golden Crown', threshold: 1000, emoji: '👑' },
  { id: 'cape', name: 'Hero Cape', threshold: 2000, emoji: '🧣' },
  { id: 'sword', name: 'Diamond Sword', threshold: 5000, emoji: '⚔️' },
];

const PixelAvatar = () => {
  const { points, setPoints } = useReward();

  const unlockedAccessories = ACCESSORIES.filter(acc => points >= acc.threshold);
  const level = Math.floor(points / 1000) + 1;

  return (
    <div className="pixel-avatar-container arcade-frame neon-border-blue">
      <div className="avatar-header">
        <h3 className="neon-text-pink">AVATAR STATUS</h3>
        <span className="level-badge neon-text-blue">LVL {level}</span>
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

      <div className="avatar-display">
        <div className="pixel-person">
          {/* Base Person */}
          <div className="pixel-head"></div>
          <div className="pixel-body"></div>
          <div className="pixel-arms"></div>
          <div className="pixel-legs"></div>
          
          {/* Accessories */}
          {unlockedAccessories.map(acc => (
            <div key={acc.id} className={`accessory ${acc.id}`}>
              <span className="accessory-icon">{acc.emoji}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="unlocks-list">
        {ACCESSORIES.map(acc => (
          <div key={acc.id} className={`unlock-item ${points >= acc.threshold ? 'unlocked' : 'locked'}`}>
            <span className="unlock-icon">{acc.emoji}</span>
            <span className="unlock-name">{acc.name}</span>
            <span className="unlock-threshold">{acc.threshold} PTS</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PixelAvatar;
