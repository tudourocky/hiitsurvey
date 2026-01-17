import React, { useState, useEffect } from 'react';
import { useReward } from '../contexts/RewardContext';
import './Workout.css';

const Workout = ({ workout, onComplete, onCancel }) => {
  const { completeWorkout } = useReward();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showCompletion, setShowCompletion] = useState(false);
  const [result, setResult] = useState(null);

  const handleAnswer = (val) => {
    setAnswers({ ...answers, [workout.questions[currentQuestionIndex].id]: val });
  };

  const next = () => {
    if (currentQuestionIndex < workout.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      const res = completeWorkout(workout.id, 60, true);
      setResult(res.reward);
      setShowCompletion(true);
    }
  };

  if (showCompletion) {
    return (
      <div className="arcade-frame neon-border-pink">
        <h2 className="neon-text-pink">MISSION ACCOMPLISHED</h2>
        <div className="result-stats">
          <p>POINTS EARNED: +{result.points}</p>
          <p>NEW SCORE: {result.points}</p>
          <p>STREAK: {result.streak}X</p>
        </div>
        <button onClick={onComplete}>RETURN TO BASE</button>
      </div>
    );
  }

  const q = workout.questions[currentQuestionIndex];

  return (
    <div className="arcade-frame neon-border-blue">
      <h2 className="neon-text-blue">{workout.title.toUpperCase()}</h2>
      <div className="question-box">
        <p className="question-text">{q.question}</p>
        <div className="answer-area">
          {q.type === 'multiple-choice' ? (
            <div className="options-grid">
              {q.options.map(opt => (
                <button 
                  key={opt}
                  className={answers[q.id] === opt ? 'active' : ''}
                  onClick={() => handleAnswer(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          ) : (
            <input 
              type="number" 
              className="arcade-input"
              onChange={(e) => handleAnswer(e.target.value)}
            />
          )}
        </div>
      </div>
      <div className="workout-nav">
        <button onClick={onCancel} className="secondary">ABORT</button>
        <button onClick={next}>NEXT</button>
      </div>
    </div>
  );
};

export default Workout;
