import React, { useState } from 'react';
import Workout from './Workout';
import RewardDisplay from './RewardDisplay';
import { useReward } from '../contexts/RewardContext';
import './WorkoutSelector.css';

// Sample workout data - in production, this would come from an API
const SAMPLE_WORKOUTS = [
  {
    id: 'workout_1',
    title: 'Morning Energy Boost',
    description: 'Start your day with high energy',
    questions: [
      {
        id: 'q1',
        question: 'How did you sleep last night?',
        type: 'multiple-choice',
        options: ['Excellent', 'Good', 'Fair', 'Poor']
      },
      {
        id: 'q2',
        question: 'Rate your current energy level (1-10)',
        type: 'scale',
        scaleMin: 1,
        scaleMax: 10
      },
      {
        id: 'q3',
        question: 'What is your main goal for today?',
        type: 'text'
      },
      {
        id: 'q4',
        question: 'How motivated do you feel right now?',
        type: 'multiple-choice',
        options: ['Very motivated', 'Somewhat motivated', 'Neutral', 'Not very motivated']
      }
    ]
  },
  {
    id: 'workout_2',
    title: 'Midday Focus Session',
    description: 'Recharge and refocus',
    questions: [
      {
        id: 'q1',
        question: 'How productive has your morning been?',
        type: 'multiple-choice',
        options: ['Very productive', 'Somewhat productive', 'Neutral', 'Not productive']
      },
      {
        id: 'q2',
        question: 'Rate your focus level (1-10)',
        type: 'scale',
        scaleMin: 1,
        scaleMax: 10
      },
      {
        id: 'q3',
        question: 'What challenges are you facing today?',
        type: 'text'
      }
    ]
  },
  {
    id: 'workout_3',
    title: 'Evening Reflection',
    description: 'Wind down and reflect',
    questions: [
      {
        id: 'q1',
        question: 'How would you rate your overall day?',
        type: 'multiple-choice',
        options: ['Excellent', 'Good', 'Fair', 'Poor']
      },
      {
        id: 'q2',
        question: 'What are you grateful for today?',
        type: 'text'
      },
      {
        id: 'q3',
        question: 'Rate your satisfaction with today\'s accomplishments (1-10)',
        type: 'scale',
        scaleMin: 1,
        scaleMax: 10
      },
      {
        id: 'q4',
        question: 'What would you like to improve tomorrow?',
        type: 'text'
      },
      {
        id: 'q5',
        question: 'How are you feeling right now?',
        type: 'multiple-choice',
        options: ['Great', 'Good', 'Okay', 'Not great']
      }
    ]
  }
];

const WorkoutSelector = () => {
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const { isWorkoutCompletedToday } = useReward();

  const handleSelectWorkout = (workout) => {
    setSelectedWorkout(workout);
  };

  const handleWorkoutComplete = () => {
    setSelectedWorkout(null);
  };

  const handleCancel = () => {
    setSelectedWorkout(null);
  };

  if (selectedWorkout) {
    return (
      <Workout
        workout={selectedWorkout}
        onComplete={handleWorkoutComplete}
        onCancel={handleCancel}
      />
    );
  }

  return (
    <div className="workout-selector-container">
      <div className="selector-header">
        <h1>🎮 Workout Selector</h1>
        <p>Choose a workout to begin your journey</p>
      </div>

      <RewardDisplay />

      <div className="workouts-grid">
        {SAMPLE_WORKOUTS.map((workout) => {
          const isCompleted = isWorkoutCompletedToday(workout.id);
          return (
            <div
              key={workout.id}
              className={`workout-card ${isCompleted ? 'completed' : ''}`}
              onClick={() => handleSelectWorkout(workout)}
            >
              <div className="workout-card-header">
                <h3>{workout.title}</h3>
                {isCompleted && (
                  <span className="completed-badge">✓ Completed Today</span>
                )}
              </div>
              <p className="workout-description">{workout.description}</p>
              <div className="workout-meta">
                <span className="question-count">
                  {workout.questions.length} questions
                </span>
                {isCompleted && (
                  <span className="replay-note">
                    Replay (no rewards)
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WorkoutSelector;


