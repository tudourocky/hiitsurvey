import React from 'react';
import { useReward } from '../contexts/RewardContext';
import './RewardDisplay.css';

const RewardDisplay = () => {
  const { points, streak, badges } = useReward();

  return (
    <div className="reward-status-bar arcade-frame neon-border-blue">
      <div className="status-item">
        <span className="label">SCORE</span>
        <span className="value neon-text-pink">{points.toString().padStart(6, '0')}</span>
      </div>
      <div className="status-item">
        <span className="label">STREAK</span>
        <span className="value neon-text-blue">{streak}X</span>
      </div>
      <div className="status-item">
        <span className="label">BADGES</span>
        <span className="value neon-text-yellow">{badges.length}</span>
      </div>
    </div>
  );
};

export default RewardDisplay;
