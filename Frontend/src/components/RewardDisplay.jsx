import React from 'react';
import { useReward } from '../contexts/RewardContext';
import './RewardDisplay.css';

const RewardDisplay = () => {
  const { points, streak, badges, recentRewards } = useReward();

  return (
    <div className="reward-display">
      <div className="reward-stats">
        <div className="stat-card points">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-label">Points</div>
            <div className="stat-value">{points.toLocaleString()}</div>
          </div>
        </div>

        <div className="stat-card streak">
          <div className="stat-icon">🔥</div>
          <div className="stat-content">
            <div className="stat-label">Streak</div>
            <div className="stat-value">{streak} days</div>
          </div>
        </div>

        <div className="stat-card badges">
          <div className="stat-icon">🏆</div>
          <div className="stat-content">
            <div className="stat-label">Badges</div>
            <div className="stat-value">{badges.length}</div>
          </div>
        </div>
      </div>

      {badges.length > 0 && (
        <div className="badges-section">
          <h3>Your Badges</h3>
          <div className="badges-grid">
            {badges.map((badge, idx) => (
              <div key={idx} className="badge-card">
                <div className="badge-icon">🏅</div>
                <div className="badge-info">
                  <div className="badge-title">{badge.name}</div>
                  <div className="badge-description">{badge.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {recentRewards.length > 0 && (
        <div className="recent-rewards">
          <h3>Recent Rewards</h3>
          <div className="rewards-list">
            {recentRewards.slice(0, 5).map((reward) => (
              <div key={reward.id} className="reward-entry">
                <div className="reward-date">
                  {new Date(reward.timestamp).toLocaleDateString()}
                </div>
                <div className="reward-details">
                  <span className="reward-workout">Workout #{reward.workoutId}</span>
                  <span className="reward-points">+{reward.points} pts</span>
                  {reward.streakBonus > 0 && (
                    <span className="reward-bonus">🔥 Streak bonus!</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RewardDisplay;


