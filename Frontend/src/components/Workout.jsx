import React, { useState, useEffect } from 'react';
import { useReward } from '../contexts/RewardContext';
import './Workout.css';

const Workout = ({ workout, onComplete, onCancel }) => {
  const { completeWorkout, canEarnReward } = useReward();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [startTime, setStartTime] = useState(null);
  const [duration, setDuration] = useState(0);
  const [showCompletion, setShowCompletion] = useState(false);
  const [completionResult, setCompletionResult] = useState(null);

  useEffect(() => {
    setStartTime(Date.now());
    const interval = setInterval(() => {
      if (startTime) {
        setDuration(Math.floor((Date.now() - startTime) / 1000));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const handleAnswer = (questionId, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < workout.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmit = () => {
    // Validate all questions are answered
    const allAnswered = workout.questions.every(q => 
      answers[q.id] !== undefined && answers[q.id] !== null && answers[q.id] !== ''
    );

    if (!allAnswered) {
      alert('Please answer all questions before completing the workout.');
      return;
    }

    // Check if questions were answered in order
    let answeredInOrder = true;
    for (let i = 0; i < workout.questions.length; i++) {
      if (!answers[workout.questions[i].id]) {
        answeredInOrder = false;
        break;
      }
    }

    if (!answeredInOrder) {
      alert('All questions must be answered in order. Please go back and complete any skipped questions.');
      return;
    }

    // Calculate duration
    const finalDuration = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;

    // Complete workout
    const result = completeWorkout(workout.id, finalDuration, allAnswered);

    if (result.success) {
      setCompletionResult(result);
      setShowCompletion(true);
    } else {
      alert(result.error);
    }
  };

  const handleFinish = () => {
    setShowCompletion(false);
    if (onComplete) {
      onComplete(completionResult);
    }
  };

  const currentQuestion = workout.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === workout.questions.length - 1;
  const isFirstQuestion = currentQuestionIndex === 0;
  const allQuestionsAnswered = workout.questions.every(q => 
    answers[q.id] !== undefined && answers[q.id] !== null && answers[q.id] !== ''
  );

  const canEarn = canEarnReward(workout.id);
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (showCompletion && completionResult) {
    return (
      <div className="workout-completion">
        <div className="completion-card">
          <h2>🎉 Workout Complete! 🎉</h2>
          <div className="reward-summary">
            <div className="reward-item">
              <span className="reward-label">Base Points:</span>
              <span className="reward-value">+{completionResult.reward.basePoints}</span>
            </div>
            {completionResult.reward.durationBonus > 0 && (
              <div className="reward-item">
                <span className="reward-label">Duration Bonus:</span>
                <span className="reward-value">+{completionResult.reward.durationBonus}</span>
              </div>
            )}
            {completionResult.reward.streakBonus > 0 && (
              <div className="reward-item">
                <span className="reward-label">Streak Milestone Bonus:</span>
                <span className="reward-value">+{completionResult.reward.streakBonus}</span>
              </div>
            )}
            <div className="reward-item total">
              <span className="reward-label">Total Points:</span>
              <span className="reward-value">+{completionResult.reward.points}</span>
            </div>
            <div className="reward-item">
              <span className="reward-label">Current Streak:</span>
              <span className="reward-value">{completionResult.reward.streak} days 🔥</span>
            </div>
            {completionResult.reward.badges.length > 0 && (
              <div className="badges-earned">
                <h3>🏆 Badges Earned:</h3>
                {completionResult.reward.badges.map(badge => (
                  <div key={badge.id} className="badge-item">
                    <span className="badge-name">{badge.name}</span>
                    <span className="badge-desc">{badge.description}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button onClick={handleFinish} className="finish-button">
            Continue
          </button>
        </div>
      </div>
    );
  }

  if (!canEarn) {
    return (
      <div className="workout-container">
        <div className="workout-header">
          <h2>{workout.title}</h2>
          <p className="workout-warning">
            ⚠️ This workout has already been completed today. 
            You can replay it, but no additional rewards will be granted.
          </p>
        </div>
        <div className="workout-actions">
          <button onClick={onCancel} className="cancel-button">
            Go Back
          </button>
          <button onClick={() => {
            // Allow replay without rewards
            setShowCompletion(true);
            setCompletionResult({
              success: true,
              reward: {
                points: 0,
                basePoints: 0,
                durationBonus: 0,
                streakBonus: 0,
                streak: 0,
                badges: [],
                message: 'Workout replayed (no rewards)'
              }
            });
          }} className="replay-button">
            Replay Anyway
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="workout-container">
      <div className="workout-header">
        <h2>{workout.title}</h2>
        <div className="workout-meta">
          <span className="duration">⏱️ {formatTime(duration)}</span>
          <span className="progress">
            Question {currentQuestionIndex + 1} of {workout.questions.length}
          </span>
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${((currentQuestionIndex + 1) / workout.questions.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="question-container">
        <div className="question-card">
          <h3 className="question-text">{currentQuestion.question}</h3>
          
          {currentQuestion.type === 'multiple-choice' && (
            <div className="answer-options">
              {currentQuestion.options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswer(currentQuestion.id, option)}
                  className={`answer-button ${
                    answers[currentQuestion.id] === option ? 'selected' : ''
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          )}

          {currentQuestion.type === 'text' && (
            <textarea
              value={answers[currentQuestion.id] || ''}
              onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
              className="answer-textarea"
              placeholder="Type your answer here..."
              rows={4}
            />
          )}

          {currentQuestion.type === 'scale' && (
            <div className="scale-container">
              <div className="scale-labels">
                <span>{currentQuestion.scaleMin || 1}</span>
                <span>{currentQuestion.scaleMax || 10}</span>
              </div>
              <input
                type="range"
                min={currentQuestion.scaleMin || 1}
                max={currentQuestion.scaleMax || 10}
                value={answers[currentQuestion.id] || currentQuestion.scaleMin || 1}
                onChange={(e) => handleAnswer(currentQuestion.id, parseInt(e.target.value))}
                className="scale-input"
              />
              <div className="scale-value">
                Selected: {answers[currentQuestion.id] || currentQuestion.scaleMin || 1}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="workout-actions">
        <button
          onClick={handlePrevious}
          disabled={isFirstQuestion}
          className="nav-button prev"
        >
          ← Previous
        </button>
        
        {!isLastQuestion ? (
          <button
            onClick={handleNext}
            disabled={!answers[currentQuestion.id]}
            className="nav-button next"
          >
            Next →
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!allQuestionsAnswered}
            className="submit-button"
          >
            Complete Workout ✓
          </button>
        )}

        <button onClick={onCancel} className="cancel-button">
          Cancel
        </button>
      </div>
    </div>
  );
};

export default Workout;


