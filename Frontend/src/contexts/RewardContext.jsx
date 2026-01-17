import React, { createContext, useContext, useState, useEffect } from 'react';

const RewardContext = createContext();

// Reward system configuration
const REWARD_CONFIG = {
  BASE_POINTS_PER_WORKOUT: 100,
  STREAK_MILESTONES: [3, 7, 14, 30, 60, 100], // Days
  STREAK_BONUSES: {
    3: 50,
    7: 100,
    14: 200,
    30: 500,
    60: 1000,
    100: 2500
  },
  DURATION_TIERS: {
    fast: { min: 0, max: 300, bonus: 0 },      // 0-5 min
    normal: { min: 300, max: 600, bonus: 25 }, // 5-10 min
    thorough: { min: 600, max: Infinity, bonus: 50 } // 10+ min
  }
};

// Badge definitions
const BADGES = {
  FIRST_WORKOUT: { id: 'first_workout', name: 'First Steps', description: 'Complete your first workout' },
  STREAK_3: { id: 'streak_3', name: 'Getting Started', description: '3 day streak' },
  STREAK_7: { id: 'streak_7', name: 'Week Warrior', description: '7 day streak' },
  STREAK_14: { id: 'streak_14', name: 'Two Week Champion', description: '14 day streak' },
  STREAK_30: { id: 'streak_30', name: 'Monthly Master', description: '30 day streak' },
  STREAK_60: { id: 'streak_60', name: 'Dedicated', description: '60 day streak' },
  STREAK_100: { id: 'streak_100', name: 'Centurion', description: '100 day streak' },
  POINTS_1000: { id: 'points_1000', name: 'Point Collector', description: 'Earn 1000 points' },
  POINTS_5000: { id: 'points_5000', name: 'Point Master', description: 'Earn 5000 points' },
  POINTS_10000: { id: 'points_10000', name: 'Point Legend', description: 'Earn 10000 points' }
};

export const RewardProvider = ({ children }) => {
  const [points, setPoints] = useState(() => {
    const saved = localStorage.getItem('reward_points');
    return saved ? parseInt(saved, 10) : 0;
  });

  const [streak, setStreak] = useState(() => {
    const saved = localStorage.getItem('reward_streak');
    return saved ? parseInt(saved, 10) : 0;
  });

  const [lastWorkoutDate, setLastWorkoutDate] = useState(() => {
    return localStorage.getItem('last_workout_date') || null;
  });

  const [badges, setBadges] = useState(() => {
    const saved = localStorage.getItem('reward_badges');
    return saved ? JSON.parse(saved) : [];
  });

  const [completedWorkouts, setCompletedWorkouts] = useState(() => {
    const saved = localStorage.getItem('completed_workouts');
    return saved ? JSON.parse(saved) : {};
  });

  const [recentRewards, setRecentRewards] = useState(() => {
    const saved = localStorage.getItem('recent_rewards');
    return saved ? JSON.parse(saved) : [];
  });

  // Check and update streak on mount
  useEffect(() => {
    checkStreak();
  }, []);

  // Save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('reward_points', points.toString());
  }, [points]);

  useEffect(() => {
    localStorage.setItem('reward_streak', streak.toString());
  }, [streak]);

  useEffect(() => {
    if (lastWorkoutDate) {
      localStorage.setItem('last_workout_date', lastWorkoutDate);
    }
  }, [lastWorkoutDate]);

  useEffect(() => {
    localStorage.setItem('reward_badges', JSON.stringify(badges));
  }, [badges]);

  useEffect(() => {
    localStorage.setItem('completed_workouts', JSON.stringify(completedWorkouts));
  }, [completedWorkouts]);

  useEffect(() => {
    localStorage.setItem('recent_rewards', JSON.stringify(recentRewards));
  }, [recentRewards]);

  const checkStreak = () => {
    if (!lastWorkoutDate) return;

    const lastDate = new Date(lastWorkoutDate);
    const now = new Date();
    const hoursSinceLastWorkout = (now - lastDate) / (1000 * 60 * 60);

    // If more than 24 hours have passed, reset streak
    if (hoursSinceLastWorkout > 24) {
      setStreak(0);
    }
  };

  const isWorkoutCompletedToday = (workoutId) => {
    const today = new Date().toDateString();
    const workoutKey = `${workoutId}_${today}`;
    return completedWorkouts[workoutKey] === true;
  };

  const canEarnReward = (workoutId) => {
    return !isWorkoutCompletedToday(workoutId);
  };

  const calculateNewStreak = () => {
    const now = new Date();
    const today = now.toDateString();

    if (!lastWorkoutDate) {
      // First workout ever
      return 1;
    }

    const lastDate = new Date(lastWorkoutDate);
    const lastDateString = lastDate.toDateString();
    const hoursSinceLastWorkout = (now - lastDate) / (1000 * 60 * 60);

    if (lastDateString === today) {
      // Already completed a workout today, don't increment streak
      return streak;
    }

    if (hoursSinceLastWorkout <= 24) {
      // Within 24-hour window, increment streak
      return streak + 1;
    } else {
      // Outside 24-hour window, reset streak
      return 1;
    }
  };

  const updateStreak = (newStreakValue) => {
    const now = new Date();
    setStreak(newStreakValue);
    setLastWorkoutDate(now.toISOString());
  };

  const calculateDurationBonus = (durationSeconds) => {
    for (const [tier, config] of Object.entries(REWARD_CONFIG.DURATION_TIERS)) {
      if (durationSeconds >= config.min && durationSeconds < config.max) {
        return config.bonus;
      }
    }
    return 0;
  };

  const checkStreakMilestone = (newStreak) => {
    const milestone = REWARD_CONFIG.STREAK_MILESTONES.find(m => newStreak === m);
    if (milestone && REWARD_CONFIG.STREAK_BONUSES[milestone]) {
      return {
        milestone,
        bonus: REWARD_CONFIG.STREAK_BONUSES[milestone]
      };
    }
    return null;
  };

  const checkBadgeUnlocks = (newPoints, newStreak) => {
    const newBadges = [];

    // First workout badge
    if (badges.length === 0 && newStreak >= 1) {
      newBadges.push(BADGES.FIRST_WORKOUT);
    }

    // Streak badges
    for (const milestone of REWARD_CONFIG.STREAK_MILESTONES) {
      const badgeKey = `STREAK_${milestone}`;
      if (newStreak >= milestone && !badges.includes(BADGES[badgeKey]?.id)) {
        newBadges.push(BADGES[badgeKey]);
      }
    }

    // Points badges
    if (newPoints >= 1000 && !badges.includes(BADGES.POINTS_1000.id)) {
      newBadges.push(BADGES.POINTS_1000);
    }
    if (newPoints >= 5000 && !badges.includes(BADGES.POINTS_5000.id)) {
      newBadges.push(BADGES.POINTS_5000);
    }
    if (newPoints >= 10000 && !badges.includes(BADGES.POINTS_10000.id)) {
      newBadges.push(BADGES.POINTS_10000);
    }

    return newBadges;
  };

  const completeWorkout = (workoutId, durationSeconds, allQuestionsAnswered) => {
    // Validate completion
    if (!allQuestionsAnswered) {
      return {
        success: false,
        error: 'All questions must be answered to complete the workout'
      };
    }

    // Check if already completed today
    if (!canEarnReward(workoutId)) {
      return {
        success: false,
        error: 'This workout has already been completed today. Replaying grants no additional rewards.'
      };
    }

    // Calculate rewards
    let totalPoints = REWARD_CONFIG.BASE_POINTS_PER_WORKOUT;
    const durationBonus = calculateDurationBonus(durationSeconds);
    totalPoints += durationBonus;

    // Calculate and update streak
    const newStreak = calculateNewStreak();
    updateStreak(newStreak);

    // Check for streak milestone bonus
    const streakMilestone = checkStreakMilestone(newStreak);
    if (streakMilestone) {
      totalPoints += streakMilestone.bonus;
    }

    // Update points
    const newPoints = points + totalPoints;
    setPoints(newPoints);

    // Check for badge unlocks
    const newBadges = checkBadgeUnlocks(newPoints, newStreak);
    if (newBadges.length > 0) {
      setBadges(prev => [...prev, ...newBadges.map(b => b.id)]);
    }

    // Mark workout as completed today
    const today = new Date().toDateString();
    const workoutKey = `${workoutId}_${today}`;
    setCompletedWorkouts(prev => ({ ...prev, [workoutKey]: true }));

    // Record reward
    const reward = {
      id: Date.now(),
      workoutId,
      points: totalPoints,
      basePoints: REWARD_CONFIG.BASE_POINTS_PER_WORKOUT,
      durationBonus,
      streakBonus: streakMilestone ? streakMilestone.bonus : 0,
      streak: newStreak,
      badges: newBadges,
      timestamp: new Date().toISOString()
    };

    setRecentRewards(prev => [reward, ...prev].slice(0, 10)); // Keep last 10

    return {
      success: true,
      reward
    };
  };

  const value = {
    points,
    streak,
    badges: badges.map(badgeId => {
      const badge = Object.values(BADGES).find(b => b.id === badgeId);
      return badge || null;
    }).filter(Boolean),
    recentRewards,
    canEarnReward,
    isWorkoutCompletedToday,
    completeWorkout,
    REWARD_CONFIG,
    BADGES
  };

  return <RewardContext.Provider value={value}>{children}</RewardContext.Provider>;
};

export const useReward = () => {
  const context = useContext(RewardContext);
  if (!context) {
    throw new Error('useReward must be used within a RewardProvider');
  }
  return context;
};


