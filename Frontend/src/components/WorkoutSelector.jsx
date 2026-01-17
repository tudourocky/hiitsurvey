import React, { useState } from 'react';
import Workout from './Workout';
import RewardDisplay from './RewardDisplay';
import { useReward } from '../contexts/RewardContext';
import './WorkoutSelector.css';

const SAMPLE_WORKOUTS = [
  {
    id: 'workout_1',
    title: 'Morning Energy',
    description: 'Quick morning blast',
    questions: [
      { id: 'q1', question: 'Sleep quality?', type: 'multiple-choice', options: ['Great', 'Good', 'Ok', 'Bad'] },
      { id: 'q2', question: 'Energy (1-10)?', type: 'scale', scaleMin: 1, scaleMax: 10 }
    ]
  },
  {
    id: 'workout_2',
    title: 'Midday Recharge',
    description: 'Beat the slump',
    questions: [
      { id: 'q1', question: 'Productivity?', type: 'multiple-choice', options: ['High', 'Mid', 'Low'] }
    ]
  }
];

export default function WorkoutSelector() {
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const { points, streak } = useReward();

  if (selectedWorkout) {
    return (
      <Workout 
        workout={selectedWorkout} 
        onComplete={() => setSelectedWorkout(null)}
        onCancel={() => setSelectedWorkout(null)}
      />
    );
  }

  return (
    <div className="workout-selector-content">
      <RewardDisplay />
      
      <div className="arcade-frame neon-border-pink">
        <h2 className="title neon-text-blue">MISSION SELECT</h2>
        <div className="workout-grid">
          {SAMPLE_WORKOUTS.map(workout => (
            <div key={workout.id} className="workout-card neon-border-blue">
              <h3 className="neon-text-pink">{workout.title.toUpperCase()}</h3>
              <p>{workout.description}</p>
              <button onClick={() => setSelectedWorkout(workout)}>SELECT</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
